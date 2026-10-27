import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { after, beforeEach, test } from "node:test";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = "solo-pruebas-correos-inkmanager-32-bytes";
process.env.FRONTEND_URL = "http://127.0.0.1:3001";
process.env.NODE_ENV = "test";
process.env.MAIL_TRANSPORT = "resend";
process.env.RESEND_API_KEY = "re_clave_ficticia";
process.env.MAIL_FROM = "InkManager <cuentas@example.com>";

const { app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
const { registrarUsuario } =
  await import("../src/usuarios/usuarios.service.js");
const { resolverUsuarioGoogle } = await import("../src/auth/google.service.js");
const {
  solicitarEnlace,
  confirmarEmail,
  restablecerPassword,
  hashTokenCuenta,
} = await import("../src/tokens-cuenta/tokens-cuenta.service.js");
const { configuracionCorreo } = await import("../src/config/correos.js");
const { correoCuenta } = await import("../src/correos/correos.templates.js");
const { enviarCorreo } = await import("../src/correos/correos.service.js");
const { registrarErrorCorreo } =
  await import("../src/correos/correos.errors.js");

type Row = Record<string, any>;
type Args = { where: Row; data: Row; select?: Row; create: Row; update: Row };
const usuarios = new Map<string, Row>();
const tokens = new Map<string, Row>();
const sesiones = new Map<string, Row>();
const enviados: Row[] = [];
let proveedorFalla = false;
let escrituraFalla = false;
const fetchReal = globalThis.fetch;

function seleccionar(row: Row | undefined, select?: Row) {
  return row
    ? select
      ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]))
      : { ...row }
    : null;
}

function reemplazar(
  t: import("node:test").TestContext,
  objeto: object,
  metodo: string,
  valor: unknown,
) {
  const registro = objeto as Row;
  const anterior = registro[metodo];
  registro[metodo] = valor;
  t.after(() => {
    registro[metodo] = anterior;
  });
}

beforeEach((t) => {
  usuarios.clear();
  tokens.clear();
  sesiones.clear();
  enviados.length = 0;
  proveedorFalla = false;
  escrituraFalla = false;
  process.env.MAIL_TRANSPORT = "resend";
  process.env.RESEND_API_KEY = "re_clave_ficticia";
  process.env.MAIL_FROM = "InkManager <cuentas@example.com>";
  t.mock.method(console, "error", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === "https://api.resend.com/emails") {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("Authorization"), "Bearer re_clave_ficticia");
        assert.ok(headers.get("Idempotency-Key"));
        if (proveedorFalla) return new Response("{}", { status: 503 });
        enviados.push(JSON.parse(String(init?.body)));
        return Response.json({ id: randomUUID() });
      }
      assert.match(String(input), /^http:\/\/127\.0\.0\.1:/);
      return fetchReal(input, init);
    },
  );
  reemplazar(t, prisma.usuario, "findFirst", async ({ where, select }: Args) =>
    seleccionar(
      [...usuarios.values()].find((u) => u.email === where.email.equals),
      select,
    ),
  );
  reemplazar(t, prisma.usuario, "findUnique", async ({ where, select }: Args) =>
    seleccionar(
      [...usuarios.values()].find((u) =>
        where.id ? u.id === where.id : u.googleId === where.googleId,
      ),
      select,
    ),
  );
  reemplazar(t, prisma.usuario, "create", async ({ data, select }: Args) => {
    const row = {
      id: randomUUID(),
      estudioId: null,
      emailVerificado: false,
      password: null,
      ...data,
    };
    usuarios.set(row.id, row);
    return seleccionar(row, select);
  });
  reemplazar(
    t,
    prisma.usuario,
    "update",
    async ({ where, data, select }: Args) => {
      if (escrituraFalla) throw new Error("fallo simulado");
      const row = usuarios.get(where.id)!;
      Object.assign(row, data);
      return seleccionar(row, select);
    },
  );
  reemplazar(
    t,
    prisma.tokenCuenta,
    "upsert",
    async ({ where, create, update }: Args) => {
      const key = `${where.usuarioId_tipo.usuarioId}/${where.usuarioId_tipo.tipo}`;
      const existente = tokens.get(key);
      const row = existente
        ? { ...existente, ...update }
        : { id: randomUUID(), usadoAt: null, createdAt: new Date(), ...create };
      tokens.set(key, row);
      return { ...row };
    },
  );
  const buscar = ({ where }: Args) =>
    where.tokenHash
      ? [...tokens.values()].find((t) => t.tokenHash === where.tokenHash)
      : tokens.get(
          `${where.usuarioId_tipo.usuarioId}/${where.usuarioId_tipo.tipo}`,
        );
  reemplazar(t, prisma.tokenCuenta, "findUnique", async (args: Args) => {
    const row = buscar(args);
    return row ? { ...row, usuario: usuarios.get(row.usuarioId) } : null;
  });
  reemplazar(t, prisma.tokenCuenta, "findUniqueOrThrow", async (args: Args) => {
    const row = buscar(args);
    assert.ok(row);
    return { ...row };
  });
  reemplazar(
    t,
    prisma.tokenCuenta,
    "updateMany",
    async ({ where, data }: Args) => {
      const row = [...tokens.values()].find(
        (t) =>
          t.tokenHash === where.tokenHash &&
          t.tipo === where.tipo &&
          !t.usadoAt &&
          t.expiraAt > where.expiraAt.gt,
      );
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
  );
  reemplazar(t, prisma.sesion, "updateMany", async ({ where, data }: Args) => {
    let count = 0;
    sesiones.forEach((row) => {
      if (row.usuarioId === where.usuarioId && !row.revocadaAt) {
        Object.assign(row, data);
        count++;
      }
    });
    return { count };
  });
  reemplazar(
    t,
    prisma,
    "$transaction",
    async (callback: (tx: typeof prisma) => Promise<unknown>) => {
      const snapshot = structuredClone({ usuarios, tokens, sesiones });
      try {
        return await callback(prisma);
      } catch (error) {
        usuarios.clear();
        tokens.clear();
        sesiones.clear();
        snapshot.usuarios.forEach((v, k) => usuarios.set(k, v));
        snapshot.tokens.forEach((v, k) => tokens.set(k, v));
        snapshot.sesiones.forEach((v, k) => sesiones.set(k, v));
        throw error;
      }
    },
  );
});

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});
const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const password = "Una contraseña nueva 1!";
function usuario(google = false) {
  const row = {
    id: randomUUID(),
    email: "ana@example.com",
    nombre: "Ana",
    rol: "ARTISTA",
    password: google ? null : "hash-anterior",
    emailVerificado: google,
    googleId: google ? "google-ana" : null,
  };
  usuarios.set(row.id, row);
  return row;
}
function tokenDelCorreo() {
  const token = /#([a-f0-9]{64})/.exec(enviados.at(-1)?.text);
  assert.ok(token);
  return token[1];
}

test("registro envía bienvenida con verificación, sin contraseña ni token crudo en BD", async () => {
  await registrarUsuario({
    nombre: "Ana",
    email: "ana@example.com",
    password,
    rol: "CLIENTE",
  });
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].subject, "Bienvenido a InkManager");
  assert.ok(enviados[0].html.includes("Ana"));
  assert.equal(enviados[0].text.includes(password), false);
  const token = tokenDelCorreo();
  assert.equal([...tokens.values()][0].tokenHash, hashTokenCuenta(token));
  assert.equal(JSON.stringify([...tokens.values()]).includes(token), false);
  assert.equal([...tokens.values()][0].tipo, "VERIFICAR_EMAIL");
});

test("Google nuevo recibe bienvenida y enlace opcional; accesos posteriores no reenvían", async () => {
  const identidad = {
    googleId: "google-ana",
    email: "ana@example.com",
    nombre: "Ana",
    registro: { rol: "CLIENTE" as const },
  };
  await resolverUsuarioGoogle(identidad);
  assert.equal([...usuarios.values()][0].password, null);
  assert.equal([...tokens.values()][0].tipo, "PASSWORD");
  assert.match(enviados[0].text, /opcional/);
  await resolverUsuarioGoogle(identidad);
  assert.equal(enviados.length, 1);
});

test("fallo del proveedor no borra la cuenta ni convierte el registro en error", async () => {
  proveedorFalla = true;
  const creado = await registrarUsuario({
    nombre: "Ana",
    email: "ana@example.com",
    password,
    rol: "CLIENTE",
  });
  assert.ok(usuarios.has(creado.id));
  assert.equal(enviados.length, 0);
});

test("recuperación admite Google, guarda hash bcrypt y revoca todas las sesiones", async () => {
  const u = usuario(true);
  sesiones.set("s1", { usuarioId: u.id, revocadaAt: null });
  sesiones.set("s2", { usuarioId: u.id, revocadaAt: null });
  await solicitarEnlace(u.email, "PASSWORD");
  const token = tokenDelCorreo();
  const response = await post("/reset-password", {
    token,
    password,
    confirmPassword: password,
  });
  assert.equal(response.status, 200);
  assert.ok(
    response.headers.get("set-cookie")?.includes("inkmanager_session=;"),
  );
  assert.ok(await bcrypt.compare(password, u.password!));
  assert.equal(u.googleId, "google-ana");
  assert.equal(u.rol, "ARTISTA");
  assert.equal(
    [...sesiones.values()].every((s) => s.revocadaAt instanceof Date),
    true,
  );
  assert.match(enviados.at(-1)!.subject, /actualizada/);
  assert.equal(
    (
      await post("/reset-password", {
        token,
        password,
        confirmPassword: password,
      })
    ).status,
    400,
  );
});

test("tokens vencidos, inventados o de verificación no permiten cambiar contraseña", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "VERIFICAR_EMAIL");
  const token = tokenDelCorreo();
  await assert.rejects(
    restablecerPassword({ token, password, confirmPassword: password }),
  );
  await assert.rejects(
    restablecerPassword({
      token: "a".repeat(64),
      password,
      confirmPassword: password,
    }),
  );
  [...tokens.values()][0].expiraAt = new Date(0);
  await assert.rejects(confirmarEmail({ token }));
  assert.equal(u.password, "hash-anterior");
  assert.equal(u.emailVerificado, false);
});

test("contraseñas débiles o distintas no consumen un enlace válido", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "PASSWORD");
  const token = tokenDelCorreo();
  await assert.rejects(
    restablecerPassword({ token, password: "corta", confirmPassword: "corta" }),
  );
  await assert.rejects(
    restablecerPassword({ token, password, confirmPassword: "otra" }),
  );
  await assert.rejects(
    restablecerPassword({
      token,
      password: "😀".repeat(30),
      confirmPassword: "😀".repeat(30),
    }),
  );
  assert.equal([...tokens.values()][0].usadoAt, null);
});

test("dos consumos simultáneos del mismo enlace solo permiten un cambio", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "PASSWORD");
  const token = tokenDelCorreo();
  const resultados = await Promise.allSettled(
    [1, 2].map(() =>
      restablecerPassword({ token, password, confirmPassword: password }),
    ),
  );
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
});

test("fallo de escritura revierte consumo del token y revocación de sesiones", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "PASSWORD");
  const token = tokenDelCorreo();
  escrituraFalla = true;
  await assert.rejects(
    restablecerPassword({ token, password, confirmPassword: password }),
  );
  assert.equal([...tokens.values()][0].usadoAt, null);
  assert.equal(usuarios.get(u.id)!.password, "hash-anterior");
});

test("verificación es de un solo uso y un token de contraseña no sirve para verificar", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "PASSWORD");
  await assert.rejects(confirmarEmail({ token: tokenDelCorreo() }));
  await solicitarEnlace(u.email, "VERIFICAR_EMAIL");
  const token = tokenDelCorreo();
  assert.equal((await post("/verify-email", { token })).status, 200);
  assert.equal(usuarios.get(u.id)!.emailVerificado, true);
  assert.equal((await post("/verify-email", { token })).status, 400);
});

test("pedidos repetidos dentro del minuto no envían correos adicionales", async () => {
  const u = usuario();
  await solicitarEnlace(u.email, "PASSWORD");
  const anterior = tokenDelCorreo();
  await solicitarEnlace(u.email, "PASSWORD");
  assert.equal(enviados.length, 1);
  [...tokens.values()][0].createdAt = new Date(Date.now() - 61_000);
  await solicitarEnlace(u.email, "PASSWORD");
  assert.equal(enviados.length, 2);
  await assert.rejects(
    restablecerPassword({
      token: anterior,
      password,
      confirmPassword: password,
    }),
  );
});

test("pedidos por email conocido o desconocido responden igual y no exponen tokens", async () => {
  usuario();
  const conocida = await post("/forgot-password", { email: "ana@example.com" });
  const desconocida = await post("/forgot-password", {
    email: "nadie@example.com",
  });
  assert.equal(conocida.status, 202);
  assert.equal(desconocida.status, 202);
  const cuerpo = await conocida.json();
  assert.deepEqual(await desconocida.json(), cuerpo);
  assert.equal(JSON.stringify(cuerpo).includes("token"), false);
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test("solicitudes inválidas, sin configuración o desde otro origen son rechazadas", async () => {
  assert.equal((await post("/forgot-password", { email: "mal" })).status, 400);
  process.env.RESEND_API_KEY = "";
  assert.equal(
    (await post("/forgot-password", { email: "ana@example.com" })).status,
    503,
  );
  const response = await fetch(`${baseUrl}/reset-password`, {
    method: "POST",
    headers: {
      Origin: "https://otro.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 403);
});

test("producción impide usar previews y exige Resend configurado", () => {
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.MAIL_TRANSPORT = "preview";
  try {
    assert.throws(configuracionCorreo);
  } finally {
    process.env.NODE_ENV = anterior;
  }
});

test("plantilla escapa HTML del nombre y del enlace", () => {
  const correo = correoCuenta({
    para: "ana@example.com",
    nombre: '<img src=x onerror="alert(1)">',
    asunto: "Hola",
    mensaje: "Texto",
    clave: "prueba",
    accion: { texto: "Abrir", url: 'https://example.com/?a="x"&b=2' },
  });
  assert.equal(correo.html.includes("<img"), false);
  assert.match(correo.html, /&quot;/);
});

test("rechazo del remitente de prueba se explica sin imprimir el email del proveedor", async (t) => {
  const privado = "destinatario-privado@example.invalid";
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        name: "validation_error",
        message: `You can only send testing emails to your own email address (${privado}).`,
      },
      { status: 403 },
    ),
  );
  const logs: string[] = [];
  t.mock.method(console, "error", (mensaje: string) => logs.push(mensaje));
  await assert.rejects(
    enviarCorreo(
      correoCuenta({
        para: "ana@example.com",
        nombre: "Ana",
        asunto: "Prueba",
        mensaje: "Prueba",
        clave: "prueba",
      }),
    ),
    (error: unknown) => {
      registrarErrorCorreo("No se pudo enviar.", error);
      assert.match(logs.join(""), /solo puede enviar al email de tu cuenta/);
      assert.equal(logs.join("").includes(privado), false);
      return true;
    },
  );
});

test("error de permisos de una clave restringida no se confunde con clave inválida", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ name: "restricted_api_key" }, { status: 401 }),
  );
  await assert.rejects(
    enviarCorreo(
      correoCuenta({
        para: "ana@example.com",
        nombre: "Ana",
        asunto: "Prueba",
        mensaje: "Prueba",
        clave: "prueba",
      }),
    ),
    /no tiene permiso/,
  );
});

test("errores de conexión no imprimen detalles internos ni credenciales", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("contenido-interno-privado");
  });
  await assert.rejects(
    enviarCorreo(
      correoCuenta({
        para: "ana@example.com",
        nombre: "Ana",
        asunto: "Prueba",
        mensaje: "Prueba",
        clave: "prueba",
      }),
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /conectar con Resend/);
      assert.equal(error.message.includes("contenido-interno-privado"), false);
      return true;
    },
  );
});
