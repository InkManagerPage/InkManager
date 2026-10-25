import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { after, beforeEach, test, type TestContext } from "node:test";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { Prisma } from "@prisma/client";

// Sin conexiones a Google ni a la base real: todas las credenciales son ficticias.
process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = "solo-pruebas-google-inkmanager-32-bytes";
process.env.FRONTEND_URL = "http://127.0.0.1:3001";
process.env.GOOGLE_CLIENT_ID = "prueba.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "secreto-ficticio";
process.env.GOOGLE_REDIRECT_URI =
  "http://127.0.0.1:4000/api/auth/google/callback";
process.env.NODE_ENV = "test";

const { app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
const {
  prepararAccesoGoogle,
  validarFlujoGoogle,
  obtenerIdentidadGoogle,
  resolverUsuarioGoogle,
} = await import("../src/auth/google.service.js");
const { validarPerfilRegistro } =
  await import("../src/usuarios/usuarios.validation.js");

type Row = Record<string, unknown>;
type Args = { data: Row; where: Row; select?: Record<string, boolean> };
const usuarios = new Map<string, Row>();
const estudios = new Map<string, Row>();
function seleccionar(row: Row | undefined, select?: Record<string, boolean>) {
  if (!row) return null;
  return select
    ? Object.fromEntries(
        Object.keys(select)
          .filter((key) => select[key])
          .map((key) => [key, row[key]]),
      )
    : { ...row };
}
function reemplazar(
  t: TestContext,
  target: object,
  key: string,
  value: unknown,
) {
  const record = target as Row;
  const anterior = record[key];
  record[key] = value;
  t.after(() => {
    record[key] = anterior;
  });
}
beforeEach((t) => {
  usuarios.clear();
  estudios.clear();
  t.mock.method(OAuth2Client.prototype, "getToken", async () => {
    throw new Error("Google real deshabilitado en pruebas");
  });
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => {
    throw new Error("Google real deshabilitado en pruebas");
  });
  reemplazar(t, prisma.usuario, "findUnique", async ({ where, select }: Args) =>
    seleccionar(
      [...usuarios.values()].find((row) => row.googleId === where.googleId),
      select,
    ),
  );
  reemplazar(
    t,
    prisma.usuario,
    "findFirst",
    async ({ where, select }: Args) => {
      const email = where.email as { equals: string };
      return seleccionar(
        [...usuarios.values()].find(
          (row) => String(row.email).toLowerCase() === email.equals,
        ),
        select,
      );
    },
  );
  reemplazar(t, prisma.usuario, "create", async ({ data, select }: Args) => {
    const row = { id: randomUUID(), estudioId: null, ...data };
    usuarios.set(row.id, row);
    return seleccionar(row, select);
  });
  reemplazar(
    t,
    prisma.usuario,
    "update",
    async ({ where, data, select }: Args) => {
      const row = usuarios.get(String(where.id));
      assert.ok(row);
      Object.assign(row, data);
      return seleccionar(row, select);
    },
  );
  reemplazar(t, prisma.estudio, "create", async ({ data }: Args) => {
    const row = { id: randomUUID(), ...data };
    estudios.set(row.id, row);
    return row;
  });
  reemplazar(
    t,
    prisma,
    "$transaction",
    async (callback: (tx: typeof prisma) => Promise<unknown>) => {
      const copiaUsuarios = structuredClone(usuarios);
      const copiaEstudios = structuredClone(estudios);
      try {
        return await callback(prisma);
      } catch (error) {
        usuarios.clear();
        estudios.clear();
        copiaUsuarios.forEach((row, id) => usuarios.set(id, row));
        copiaEstudios.forEach((row, id) => estudios.set(id, row));
        throw error;
      }
    },
  );
});

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}/api/auth/google`;
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await prisma.$disconnect();
});
function post(body: unknown, origin = "http://127.0.0.1:3001") {
  return fetch(baseUrl + "/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}
function leerFlujo(token: string) {
  const flujo = jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ["HS256"],
    issuer: "inkmanager-api",
    audience: "inkmanager-google-oauth",
  });
  assert.notEqual(typeof flujo, "string");
  return flujo as jwt.JwtPayload;
}
const perfiles = [
  { rol: "CLIENTE" },
  { rol: "ARTISTA", nombreArtistico: "Ana Ink" },
  { rol: "ESTUDIO_ADMIN", nombreEstudio: "Estudio Ana" },
] as const;

for (const perfil of perfiles) {
  test(`Google: inicio de registro ${perfil.rol} guarda el perfil firmado en cookie`, async () => {
    const response = await post(perfil);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\/api\/auth\/google/);
    assert.match(cookie, /Max-Age=600/);
    const flujo = leerFlujo(cookie.split(";")[0].split("=")[1]);
    assert.deepEqual(flujo.registro, perfil);
    assert.equal(flujo.exp! - flujo.iat!, 600);
    const url = new URL((await response.json()).url);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("state"), flujo.state);
    assert.equal(url.searchParams.get("nonce"), flujo.nonce);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(
      url.searchParams.get("code_challenge"),
      createHash("sha256").update(flujo.codeVerifier).digest("base64url"),
    );
    assert.equal(url.searchParams.has("rol"), false);
    assert.equal(url.searchParams.has("codeVerifier"), false);
    assert.equal(usuarios.size, 0);
  });
}
for (const entrada of [
  null,
  [],
  {},
  { rol: "SUPERADMIN" },
  { rol: "ARTISTA" },
  { rol: "ESTUDIO_ADMIN", nombreEstudio: "a" },
]) {
  test(`Google: rechaza perfil inválido ${JSON.stringify(entrada)}`, async () => {
    const response = await post(entrada);
    assert.equal(response.status, 400);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal(usuarios.size, 0);
  });
}
test("Google: login no incorpora roles desde query y registro rechaza otro origen o formato", async () => {
  const response = await fetch(baseUrl + "?rol=SUPERADMIN", {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 302);
  const flujo = leerFlujo(
    response.headers.get("set-cookie")!.split(";")[0].split("=")[1],
  );
  assert.equal(flujo.registro, undefined);
  assert.equal((await post(perfiles[0], "https://otro.example")).status, 403);
  assert.equal(
    (
      await fetch(baseUrl + "/registro", {
        method: "POST",
        body: "rol=CLIENTE",
        signal: AbortSignal.timeout(10000),
      })
    ).status,
    415,
  );
});
test("Google: descarta campos ajenos y exige state, firma y vigencia", async () => {
  assert.deepEqual(
    validarPerfilRegistro({
      rol: "CLIENTE",
      estudioId: "ajeno",
      nombreEstudio: "Ignorar",
    }),
    { rol: "CLIENTE" },
  );
  const { flujoToken } = await prepararAccesoGoogle(perfiles[1]);
  const flujo = leerFlujo(flujoToken);
  assert.deepEqual(
    validarFlujoGoogle(flujoToken, flujo.state).registro,
    perfiles[1],
  );
  assert.throws(() => validarFlujoGoogle(undefined, flujo.state), {
    status: 400,
  });
  assert.throws(() => validarFlujoGoogle(flujoToken, "otro-state"), {
    status: 400,
  });
  assert.throws(
    () => validarFlujoGoogle(flujoToken.slice(0, -5) + "xxxxx", flujo.state),
    { status: 400 },
  );
  for (const datos of [
    { ...flujo, exp: 1 },
    { ...flujo, registro: { rol: "SUPERADMIN" } },
    { ...flujo, aud: "otro" },
  ]) {
    const token = jwt.sign(datos, process.env.JWT_SECRET!, {
      algorithm: "HS256",
    });
    assert.throws(() => validarFlujoGoogle(token, flujo.state), {
      status: 400,
    });
  }
});
test("Google: identidad verificada conserva el perfil del flujo, nonce y PKCE", async (t) => {
  const { flujoToken } = await prepararAccesoGoogle(perfiles[2]);
  const flujo = leerFlujo(flujoToken);
  t.mock.method(OAuth2Client.prototype, "getToken", async (options: Row) => {
    assert.equal(options.code, "codigo-ficticio");
    assert.equal(options.codeVerifier, flujo.codeVerifier);
    return { tokens: { id_token: "token-ficticio" } };
  });
  const perfil = {
    sub: "google-ana",
    email: " Ana@Example.com ",
    name: " Ana ",
    email_verified: true,
    nonce: flujo.nonce,
  };
  t.mock.method(
    OAuth2Client.prototype,
    "verifyIdToken",
    async (options: Row) => {
      assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
      return { getPayload: () => perfil };
    },
  );
  assert.deepEqual(
    await obtenerIdentidadGoogle("codigo-ficticio", flujoToken, flujo.state),
    {
      googleId: "google-ana",
      email: "ana@example.com",
      nombre: "Ana",
      registro: perfiles[2],
    },
  );
  perfil.nonce = "otro";
  await assert.rejects(
    obtenerIdentidadGoogle("codigo-ficticio", flujoToken, flujo.state),
    { status: 401 },
  );
  perfil.nonce = flujo.nonce;
  perfil.email_verified = false;
  await assert.rejects(
    obtenerIdentidadGoogle("codigo-ficticio", flujoToken, flujo.state),
    { status: 401 },
  );
});

const identidad = {
  googleId: "google-ana",
  email: "ana@example.com",
  nombre: "Ana",
};
for (const registro of perfiles) {
  test(`Google: cuenta nueva ${registro.rol} persiste rol y datos propios`, async () => {
    const usuario = await resolverUsuarioGoogle({ ...identidad, registro });
    assert.equal(usuario.rol, registro.rol);
    assert.equal("password" in usuario, false);
    assert.equal("googleId" in usuario, false);
    const guardado = usuarios.get(usuario.id)!;
    assert.equal(guardado.password, null);
    assert.equal(guardado.emailVerificado, true);
    assert.equal(
      guardado.nombreArtistico,
      registro.rol === "ARTISTA" ? registro.nombreArtistico : null,
    );
    assert.equal(estudios.size, registro.rol === "ESTUDIO_ADMIN" ? 1 : 0);
    if (registro.rol === "ESTUDIO_ADMIN") {
      const estudio = estudios.get(usuario.estudioId!)!;
      assert.equal(estudio.propietarioId, usuario.id);
      assert.equal(estudio.nombre, registro.nombreEstudio);
    }
  });
}
test("Google: una cuenta existente mantiene rol y estudio aunque venga de otra landing", async () => {
  const original = await resolverUsuarioGoogle({
    ...identidad,
    registro: perfiles[2],
  });
  const recibido = await resolverUsuarioGoogle({
    ...identidad,
    registro: perfiles[0],
  });
  assert.deepEqual(recibido, original);
  assert.deepEqual(await resolverUsuarioGoogle(identidad), original);
  assert.equal(usuarios.size, 1);
  assert.equal(estudios.size, 1);
});
test("Google: no crea cuentas durante login ni vincula automáticamente un email existente", async () => {
  await assert.rejects(resolverUsuarioGoogle(identidad), { status: 409 });
  usuarios.set("local", {
    id: "local",
    email: identidad.email,
    rol: "ARTISTA",
    googleId: null,
  });
  await assert.rejects(
    resolverUsuarioGoogle({ ...identidad, registro: perfiles[0] }),
    { status: 409 },
  );
  assert.equal(usuarios.get("local")!.googleId, null);
  assert.equal(usuarios.size, 1);
});
test("Google: fallo al crear estudio revierte el usuario", async (t) => {
  reemplazar(t, prisma.estudio, "create", async () => {
    throw new Error("Fallo simulado");
  });
  await assert.rejects(
    resolverUsuarioGoogle({ ...identidad, registro: perfiles[2] }),
    /Fallo simulado/,
  );
  assert.equal(usuarios.size, 0);
  assert.equal(estudios.size, 0);
});
test("Google: alta simultánea recupera la cuenta sin cambiar su rol", async (t) => {
  const existente = {
    id: "otro-intento",
    ...identidad,
    rol: "ARTISTA",
    estudioId: null,
  };
  let consultas = 0;
  reemplazar(t, prisma.usuario, "findUnique", async () =>
    ++consultas === 1 ? null : existente,
  );
  reemplazar(t, prisma.usuario, "create", async () => {
    throw new Prisma.PrismaClientKnownRequestError("Duplicado", {
      code: "P2002",
      clientVersion: "test",
    });
  });
  assert.deepEqual(
    await resolverUsuarioGoogle({ ...identidad, registro: perfiles[0] }),
    existente,
  );
});
