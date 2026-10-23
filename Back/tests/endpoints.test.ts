import assert from "node:assert/strict";
import { once } from "node:events";
import { after, beforeEach, test, type TestContext } from "node:test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

// Estas pruebas nunca usan Supabase ni Cloudinary reales.
// Las URL locales inválidas también impiden una conexión accidental.
process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = "solo-pruebas-aisladas-inkmanager-32-bytes";
process.env.FRONTEND_URL = "http://127.0.0.1:3001";
process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
const { default: cloudinary } = await import("../src/config/cloudinary.js");
const { limitarLogin } = await import("../src/middlewares/limitar-login.js");
const { requerirRoles } = await import("../src/middlewares/roles.js");
const { Rol } = await import("../src/types/roles.js");
const { crearToken } = await import("../src/auth/auth.tokens.js");

type Row = Record<string, unknown>;
type Args = { where?: Row; data?: Row; select?: Record<string, boolean> };
type Query = (args: Args) => Promise<unknown>;
const users = new Map<string, Row>();
const sessions = new Map<string, Row>();
const studios = new Map<string, Row>();
const restores: (() => void)[] = [];
let uploads = 0;

function replace(target: object, key: string, method: unknown) {
  const record = target as Record<string, unknown>;
  const original = record[key];
  record[key] = method;
  restores.push(() => {
    record[key] = original;
  });
}
function simulate(
  t: TestContext,
  target: object,
  key: string,
  method: unknown,
) {
  const record = target as Record<string, unknown>;
  const original = record[key];
  record[key] = method;
  t.after(() => {
    record[key] = original;
  });
}
function select(row: Row | undefined, fields?: Record<string, boolean>) {
  if (!row) return null;
  return fields
    ? Object.fromEntries(
        Object.keys(fields)
          .filter((key) => fields[key])
          .map((key) => [key, row[key]]),
      )
    : { ...row };
}
const findUser: Query = async ({ where, select: fields }) => {
  const email = where?.email as { equals?: string } | undefined;
  const user = [...users.values()].find((row) =>
    email
      ? String(row.email).toLowerCase() === email.equals
      : row.tokenVerificacionEmail === where?.tokenVerificacionEmail,
  );
  return select(user, fields);
};
replace(prisma.usuario, "findFirst", findUser);
replace(prisma.usuario, "findUnique", async ({ where, select: fields }: Args) =>
  select(users.get(String(where?.id)), fields),
);
replace(prisma.usuario, "findMany", async () => []);
replace(prisma.usuario, "create", async ({ data, select: fields }: Args) => {
  const id = randomUUID();
  const row = {
    id,
    estudioId: null,
    estadoVerificacion: "NO_VERIFICADO",
    nombreArtistico: null,
    createdAt: new Date(),
    ...data,
  };
  users.set(id, row);
  return select(row, fields);
});
replace(
  prisma.usuario,
  "update",
  async ({ where, data, select: fields }: Args) => {
    const row = users.get(String(where?.id));
    assert.ok(row);
    Object.assign(row, data);
    return select(row, fields);
  },
);
replace(prisma.estudio, "create", async ({ data }: Args) => {
  const row = { id: randomUUID(), ...data };
  studios.set(row.id, row);
  return row;
});
replace(prisma.sesion, "create", async ({ data }: Args) => {
  const row = {
    id: randomUUID(),
    revocadaAt: null,
    createdAt: new Date(),
    ...data,
  };
  sessions.set(row.id, row);
  return row;
});
replace(
  prisma.sesion,
  "findUnique",
  async ({ where }: Args) => sessions.get(String(where?.id)) ?? null,
);
replace(prisma.sesion, "updateMany", async ({ where, data }: Args) => {
  let count = 0;
  for (const row of sessions.values()) {
    if (
      row.id === where?.id &&
      row.usuarioId === where?.usuarioId &&
      row.revocadaAt === null
    ) {
      Object.assign(row, data);
      count++;
    }
  }
  return { count };
});
replace(
  prisma,
  "$transaction",
  async (callback: (tx: typeof prisma) => Promise<unknown>) => {
    // Simulamos rollback para comprobar que el alta de estudio es atómica.
    const snapshotUsers = structuredClone(users);
    const snapshotStudios = structuredClone(studios);
    try {
      return await callback(prisma);
    } catch (error) {
      users.clear();
      studios.clear();
      snapshotUsers.forEach((row, id) => users.set(id, row));
      snapshotStudios.forEach((row, id) => studios.set(id, row));
      throw error;
    }
  },
);
replace(cloudinary.uploader, "upload", async () => {
  uploads++;
  return { secure_url: "https://example.com/test.png", public_id: "qa/test" };
});

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}/api`;
const password = "Una frase segura para probar";
const base = {
  nombre: "Ana",
  email: "ana@example.com",
  password,
  rol: "CLIENTE",
};
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=",
  "base64",
);
const request = (path: string, options: RequestInit = {}) =>
  fetch(baseUrl + path, { ...options, signal: AbortSignal.timeout(10000) });
const post = (path: string, body: unknown, cookie?: string) =>
  request(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
async function login() {
  assert.equal((await post("/auth/register", base)).status, 201);
  const response = await post("/auth/login", { email: base.email, password });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
function upload(
  cookie?: string,
  field = "imagen",
  bytes: Uint8Array = png,
  type = "image/png",
) {
  const form = new FormData();
  form.set(field, new Blob([bytes], { type }), "prueba.png");
  return request("/upload", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: form,
  });
}
beforeEach(async () => {
  users.clear();
  studios.clear();
  sessions.clear();
  uploads = 0;
  await limitarLogin.resetKey("127.0.0.1");
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  restores.reverse().forEach((restore) => restore());
  await prisma.$disconnect();
});

test("health y reseñas públicas", async () => {
  assert.equal((await request("/health")).status, 200);
  assert.deepEqual(await (await request("/resenas")).json(), []);
});
for (const rol of ["CLIENTE", "ARTISTA", "ESTUDIO_ADMIN"]) {
  test(`registro de ${rol}: datos públicos, hash y relación de estudio`, async () => {
    const response = await post("/auth/register", {
      ...base,
      rol,
      nombreArtistico: "Ana Ink",
      nombreEstudio: "Estudio Ana",
      emailVerificado: true,
    });
    assert.equal(response.status, 201);
    const { user } = await response.json();
    assert.equal(user.rol, rol);
    assert.equal(user.password, undefined);
    assert.equal(user.tokenVerificacionEmail, undefined);
    assert.equal(user.emailVerificado, false);
    const saved = users.get(user.id)!;
    assert.notEqual(saved.password, password);
    assert.equal(await bcrypt.compare(password, String(saved.password)), true);
    assert.equal(studios.size, rol === "ESTUDIO_ADMIN" ? 1 : 0);
    if (rol === "ESTUDIO_ADMIN") assert.ok(saved.estudioId);
  });
}
for (const [name, changes] of [
  ["nombre numérico", { nombre: 42 }],
  ["nombre corto", { nombre: "a" }],
  ["email inválido", { email: "correo" }],
  ["contraseña corta", { password: "123" }],
  ["contraseña en blanco", { password: " ".repeat(20) }],
  ["contraseña >72 bytes", { password: "á".repeat(37) }],
  ["SUPERADMIN", { rol: "SUPERADMIN" }],
  ["rol desconocido", { rol: "ARTIST" }],
  ["artista sin nombre artístico", { rol: "ARTISTA" }],
  ["estudio sin nombre", { rol: "ESTUDIO_ADMIN" }],
]) {
  test(`registro rechaza ${name}`, async () => {
    assert.equal(
      (await post("/auth/register", { ...base, ...changes })).status,
      400,
    );
    assert.equal(users.size, 0);
  });
}
test("email normalizado y duplicados", async () => {
  assert.equal(
    (await post("/auth/register", { ...base, email: " ANA@EXAMPLE.COM " }))
      .status,
    201,
  );
  assert.equal([...users.values()][0].email, base.email);
  assert.equal((await post("/auth/register", base)).status, 409);
});
for (const [name, changes] of [
  ["password corto", { password: "123" }],
  ["email inválido", { email: "correo" }],
  ["nombre artístico numérico", { nombreArtistico: 123 }],
  ["boolean incorrecto", { aceptaCoverUp: "si" }],
  ["número negativo", { tarifaMinima: -1 }],
  ["número decimal entero", { anosExperiencia: 1.5 }],
  ["lista inválida", { estilosPrincipales: [12] }],
  ["galería inválida", { galeria: [{ url: "javascript:alert(1)" }] }],
  ["URL inválida", { fotoPerfil: "javascript:alert(1)" }],
  ["horarios inválidos", { horariosAtencion: true }],
]) {
  test(`alta antigua rechaza ${name}`, async () => {
    assert.equal(
      (
        await post("/auth/register-artist", {
          ...base,
          nombreArtistico: "Ana Ink",
          ...changes,
        })
      ).status,
      400,
    );
    assert.equal(users.size, 0);
  });
}
test("alta antigua conserva perfiles válidos y el rol artista", async () => {
  const response = await post("/auth/register-artist", {
    ...base,
    nombreArtistico: "Ana Ink",
    rol: "SUPERADMIN",
    estilosPrincipales: ["Tradicional"],
    tarifaMinima: 100,
  });
  assert.equal(response.status, 201);
  const { user } = await response.json();
  assert.equal(user.rol, "ARTISTA");
  assert.deepEqual(users.get(user.id)!.estilosPrincipales, ["Tradicional"]);
  assert.equal(
    (
      await post("/auth/register-artist", {
        ...base,
        nombreArtistico: "Ana Ink",
      })
    ).status,
    409,
  );
});
test("login, cookie segura, claims y /me sin datos sensibles", async () => {
  await post("/auth/register", base);
  const response = await post("/auth/login", {
    email: " ANA@EXAMPLE.COM ",
    password,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const header = response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Path=\//);
  const cookie = header.split(";")[0];
  const token = cookie.slice("inkmanager_session=".length);
  const claims = jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ["HS256"],
    issuer: "inkmanager-api",
    audience: "inkmanager-web",
  }) as jwt.JwtPayload;
  assert.ok(claims.sub && claims.jti);
  assert.equal(claims.exp! - claims.iat!, 3600);
  const me = await request("/auth/me", { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.deepEqual(Object.keys((await me.json()).user).sort(), [
    "email",
    "estudioId",
    "id",
    "nombre",
    "rol",
  ]);
});
test("error uniforme para contraseña y usuario inexistente", async () => {
  await post("/auth/register", base);
  const incorrecta = await post("/auth/login", {
    email: base.email,
    password: "incorrecta",
  });
  const ausente = await post("/auth/login", {
    email: "otro@example.com",
    password,
  });
  assert.equal(incorrecta.status, 401);
  assert.equal(ausente.status, 401);
  assert.deepEqual(await incorrecta.json(), await ausente.json());
  assert.equal(sessions.size, 0);
});
test("limitador bloquea el sexto intento", async () => {
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await post("/auth/login", { email: base.email, password })).status,
      401,
    );
  assert.equal(
    (await post("/auth/login", { email: base.email, password })).status,
    429,
  );
});
for (const cookie of ["", "inkmanager_session=alterado"]) {
  test(`/me rechaza cookie ${cookie ? "inválida" : "ausente"}`, async () => {
    assert.equal(
      (await request("/auth/me", { headers: { Cookie: cookie } })).status,
      401,
    );
  });
}
for (const state of [
  "revocada",
  "vencida",
  "otro propietario",
  "eliminada",
  "usuario eliminado",
]) {
  test(`/me rechaza sesión ${state}`, async () => {
    const cookie = await login();
    const session = [...sessions.values()][0];
    if (state === "revocada") session.revocadaAt = new Date();
    if (state === "vencida") session.expiraAt = new Date(0);
    if (state === "otro propietario") session.usuarioId = randomUUID();
    if (state === "eliminada") sessions.clear();
    if (state === "usuario eliminado") users.clear();
    assert.equal(
      (await request("/auth/me", { headers: { Cookie: cookie } })).status,
      401,
    );
  });
}
test("logout revoca, elimina cookie e impide reutilización; otra sesión sigue vigente", async () => {
  const cookie = await login();
  const second = await post("/auth/login", { email: base.email, password });
  const otherCookie = second.headers.get("set-cookie")!.split(";")[0];
  const response = await post("/auth/logout", {}, cookie);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
  assert.equal(
    (await request("/auth/me", { headers: { Cookie: cookie } })).status,
    401,
  );
  assert.equal(
    (await request("/auth/me", { headers: { Cookie: otherCookie } })).status,
    200,
  );
  assert.equal((await post("/auth/logout", {}, cookie)).status, 200);
  assert.equal((await post("/auth/logout", {})).status, 200);
});
test("rol se consulta en BD, no queda congelado en JWT", async () => {
  const cookie = await login();
  [...users.values()][0].rol = "ARTISTA";
  const response = await request("/auth/me", { headers: { Cookie: cookie } });
  assert.equal((await response.json()).user.rol, "ARTISTA");
});
test("tokens expirados, de otra audiencia, sin jti o firmados con otra clave se rechazan", async () => {
  const tokens = [
    jwt.sign({}, process.env.JWT_SECRET!, {
      subject: "test",
      jwtid: "test",
      expiresIn: -1,
      audience: "inkmanager-web",
      issuer: "inkmanager-api",
    }),
    jwt.sign({}, process.env.JWT_SECRET!, {
      subject: "test",
      jwtid: "test",
      audience: "otro",
      issuer: "inkmanager-api",
    }),
    jwt.sign({}, process.env.JWT_SECRET!, {
      subject: "test",
      audience: "inkmanager-web",
      issuer: "inkmanager-api",
    }),
    jwt.sign({}, "otra-clave", {
      subject: "test",
      jwtid: "test",
      audience: "inkmanager-web",
      issuer: "inkmanager-api",
    }),
    crearToken("usuario-inexistente", "sesion-inexistente"),
  ];
  for (const token of tokens)
    assert.equal(
      (
        await request("/auth/me", {
          headers: { Cookie: `inkmanager_session=${token}` },
        })
      ).status,
      401,
    );
});
test("filtro de roles: matriz completa y rechazo sin usuario", () => {
  for (const permitido of Object.values(Rol)) {
    for (const actual of Object.values(Rol)) {
      let status = 0;
      let next = false;
      const res = {
        status(value: number) {
          status = value;
          return this;
        },
        json() {},
      } as unknown as Response;
      const req = { usuario: { rol: actual } } as Request;
      requerirRoles(permitido)(req, res, () => {
        next = true;
      });
      assert.equal(next, actual === permitido);
      assert.equal(status, actual === permitido ? 0 : 403);
    }
  }
  let status = 0;
  requerirRoles(Rol.CLIENTE)(
    {} as Request,
    {
      status(value: number) {
        status = value;
        return this;
      },
      json() {},
    } as unknown as Response,
    () => assert.fail(),
  );
  assert.equal(status, 401);
});
test("upload requiere sesión antes de procesar el archivo", async () => {
  assert.equal((await upload()).status, 401);
  assert.equal(uploads, 0);
});
test("upload válido autenticado devuelve Cloudinary", async () => {
  const cookie = await login();
  const response = await upload(cookie);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).public_id, "qa/test");
  assert.equal(uploads, 1);
});
test("upload sin archivo, campo incorrecto, tipo y firma inválidos: 400 JSON", async () => {
  const cookie = await login();
  const responses = [
    await post("/upload", {}, cookie),
    await upload(cookie, "otro"),
    await upload(cookie, "imagen", png, "text/plain"),
    await upload(cookie, "imagen", Buffer.from("texto"), "image/png"),
  ];
  for (const response of responses) {
    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type")!, /json/);
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.equal(uploads, 0);
});
test("upload mayor a 5 MB devuelve 413 JSON", async () => {
  const cookie = await login();
  const response = await upload(
    cookie,
    "imagen",
    new Uint8Array(5 * 1024 * 1024 + 1),
  );
  assert.equal(response.status, 413);
  assert.match(response.headers.get("content-type")!, /json/);
  assert.equal(uploads, 0);
});
test("JSON inválido, cuerpo excesivo y ruta inexistente devuelven JSON", async () => {
  const invalid = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).error);
  const large = await post("/auth/register", { data: "x".repeat(110000) });
  assert.equal(large.status, 413);
  assert.ok((await large.json()).error);
  const missing = await request("/no-existe");
  assert.equal(missing.status, 404);
  assert.ok((await missing.json()).error);
});
test("origen ajeno bloqueado también para registro y upload", async () => {
  for (const path of [
    "/auth/register",
    "/auth/login",
    "/auth/logout",
    "/upload",
  ]) {
    const response = await request(path, {
      method: "POST",
      headers: {
        Origin: "https://otro.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(base),
    });
    assert.equal(response.status, 403);
  }
});
test("CORS permite el frontend con credenciales", async () => {
  const response = await request("/auth/me", {
    method: "OPTIONS",
    headers: {
      Origin: "http://127.0.0.1:3001",
      "Access-Control-Request-Method": "GET",
    },
  });
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:3001",
  );
  assert.equal(
    response.headers.get("access-control-allow-credentials"),
    "true",
  );
});
test("fallo de almacenamiento no expone datos internos", async (t) => {
  simulate(t, prisma.usuario, "findFirst", async () => {
    throw new Error("dato privado");
  });
  t.mock.method(console, "error", () => {});
  const response = await post("/auth/login", { email: base.email, password });
  assert.equal(response.status, 500);
  assert.doesNotMatch(
    await response.text(),
    /dato privado|password|postgresql/,
  );
});
test("fallo en creación del estudio revierte la cuenta", async (t) => {
  simulate(t, prisma.estudio, "create", async () => {
    throw new Error("fallo simulado");
  });
  t.mock.method(console, "error", () => {});
  assert.equal(
    (
      await post("/auth/register", {
        ...base,
        rol: "ESTUDIO_ADMIN",
        nombreEstudio: "Ana Ink",
      })
    ).status,
    500,
  );
  assert.equal(users.size, 0);
});
test("fallo al revocar conserva la cookie y devuelve error", async (t) => {
  const cookie = await login();
  simulate(t, prisma.sesion, "updateMany", async () => {
    throw new Error("fallo simulado");
  });
  t.mock.method(console, "error", () => {});
  const response = await post("/auth/logout", {}, cookie);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("set-cookie"), null);
});
test("verificación de email y token de un solo uso", async () => {
  await post("/auth/register", base);
  const user = [...users.values()][0];
  assert.equal((await request("/auth/verify-email")).status, 400);
  assert.equal(
    (await request("/auth/verify-email?token=no-existe")).status,
    404,
  );
  const url = `/auth/verify-email?token=${user.tokenVerificacionEmail}`;
  assert.equal((await request(url)).status, 200);
  assert.equal(user.emailVerificado, true);
  assert.equal(user.tokenVerificacionEmail, null);
  assert.equal((await request(url)).status, 404);
});
