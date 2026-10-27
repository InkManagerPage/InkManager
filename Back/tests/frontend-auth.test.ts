import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarLogin,
  validarRegistro,
} from "../../Front/src/lib/auth-validation.js";
import { apiFetch, ApiError } from "../../Front/src/lib/api-client.js";
import { crearValoresRegistro } from "../../Front/src/lib/registro.js";

const registro = {
  nombre: "Ana",
  email: "ana@example.com",
  password: "Una frase segura 1!",
  confirmPassword: "Una frase segura 1!",
  rol: "CLIENTE" as const,
  nombreArtistico: "",
  nombreEstudio: "",
};
test("frontend: clientes empiezan como CLIENTE y profesionales como ARTISTA", () => {
  assert.equal(crearValoresRegistro("cliente").rol, "CLIENTE");
  assert.equal(crearValoresRegistro("profesional").rol, "ARTISTA");
  assert.notEqual(
    crearValoresRegistro("cliente"),
    crearValoresRegistro("cliente"),
  );
});
test("frontend: login requiere email válido y contraseña", () => {
  assert.deepEqual(validarLogin({ email: "", password: "" }), {
    email: "Ingresá un email válido.",
    password: "Ingresá tu contraseña.",
  });
  assert.deepEqual(
    validarLogin({ email: " ana@example.com ", password: "clave-anterior" }),
    {},
  );
});
test("frontend: alta válida de cliente, artista y estudio", () => {
  assert.deepEqual(validarRegistro(registro), {});
  assert.deepEqual(
    validarRegistro({
      ...registro,
      rol: "ARTISTA",
      nombreArtistico: "Ana Ink",
    }),
    {},
  );
  assert.deepEqual(
    validarRegistro({
      ...registro,
      rol: "ESTUDIO_ADMIN",
      nombreEstudio: "Ana Studio",
    }),
    {},
  );
});
test("frontend: campos vacíos, contraseña débil y confirmación", () => {
  assert.ok(validarRegistro({ ...registro, nombre: "a" }).nombre);
  assert.ok(validarRegistro({ ...registro, email: "correo" }).email);
  assert.ok(validarRegistro({ ...registro, password: "123" }).password);
  assert.ok(
    validarRegistro({ ...registro, password: " ".repeat(15) }).password,
  );
  assert.ok(
    validarRegistro({ ...registro, password: "á".repeat(37) }).password,
  );
  assert.ok(
    validarRegistro({ ...registro, confirmPassword: "otra" }).confirmPassword,
  );
});
test("frontend: solo exige el nombre adicional del rol elegido", () => {
  assert.ok(validarRegistro({ ...registro, rol: "ARTISTA" }).nombreArtistico);
  assert.ok(
    validarRegistro({ ...registro, rol: "ESTUDIO_ADMIN" }).nombreEstudio,
  );
  assert.equal(validarRegistro(registro).nombreEstudio, undefined);
  assert.equal(validarRegistro(registro).nombreArtistico, undefined);
});
test("frontend: HTTP incluye cookies y acepta JSON", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      assert.equal(options.credentials, "include");
      assert.equal(
        new Headers(options.headers).get("Accept"),
        "application/json",
      );
      assert.ok(options.signal);
      return new Response("{}", { status: 200 });
    },
  );
  assert.equal((await apiFetch("/auth/me")).status, 200);
});
test("frontend: conserva mensaje y código del backend", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ error: "Email o contraseña incorrectos." }),
        { status: 401 },
      ),
  );
  await assert.rejects(
    apiFetch("/auth/login"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.message === "Email o contraseña incorrectos.",
  );
});
test("frontend: error no JSON tiene un mensaje legible", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<html>Error</html>", { status: 502 }),
  );
  await assert.rejects(apiFetch("/auth/me"), /No pudimos completar/);
});
test("frontend: desconexión informada y cancelación conservada", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(apiFetch("/auth/me"), /No pudimos conectar/);
  mock.mock.mockImplementation(async () => {
    throw new DOMException("cancelada", "AbortError");
  });
  await assert.rejects(apiFetch("/auth/me"), { name: "AbortError" });
});
