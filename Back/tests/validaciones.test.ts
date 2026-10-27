import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarNombre,
  validarPassword,
} from "../src/usuarios/usuarios.validation.js";
import {
  errorPassword,
  validarRegistro,
  validarNuevaPassword,
  validarLogin,
} from "../../Front/src/lib/auth-validation.js";
import {
  validarCiudad,
  obtenerUbicacion,
  obtenerCiudades,
} from "../src/ubicaciones/ubicaciones.service.js";

const registro = {
  nombre: "Ana",
  email: "ana@example.test",
  password: "Abcdef1!x",
  confirmPassword: "Abcdef1!x",
  rol: "CLIENTE" as const,
  nombreArtistico: "",
  nombreEstudio: "",
};

test("nombre: frontend y backend aceptan letras, tildes y espacios entre 2 y 20 caracteres", () => {
  for (const nombre of [
    "Ana",
    "Álvaro José",
    "Jo",
    "A".repeat(20),
    "Jose\u0301",
    " Ana  María ",
  ]) {
    assert.equal(
      validarRegistro({ ...registro, nombre }).nombre,
      undefined,
      nombre,
    );
    assert.doesNotThrow(() => validarNombre(nombre), nombre);
  }
  assert.equal(validarNombre("Jose\u0301"), "José");
  assert.equal(validarNombre(" Ana  María "), "Ana María");
});

test("nombre: números, símbolos, campos vacíos y longitudes inválidas son rechazados", () => {
  for (const nombre of [
    "",
    " ",
    "A",
    "A".repeat(21),
    "Ana2",
    "Ana_",
    "Ana!",
    "Ana-María",
    "O'Neil",
    "Ana\nMaría",
    "123",
  ]) {
    assert.ok(validarRegistro({ ...registro, nombre }).nombre, nombre);
    assert.throws(() => validarNombre(nombre), nombre);
  }
  for (const nombre of [null, undefined, 42, {}, ["Ana"]])
    assert.throws(() => validarNombre(nombre));
});

test("contraseñas nuevas: registro, recuperación y backend comparten la política", () => {
  const casos: [string, boolean][] = [
    ["Abcdef1!x", true],
    ["ABCDEFG1!", true],
    ["Ábcdef1¿x", true],
    ["Aa 12345!", true],
    ["Abcde1!x", false],
    ["abcdef1!x", false],
    ["Abcdefg!x", false],
    ["Abcdefg1x", false],
    ["Abcdefg1 ", false],
    [" ".repeat(20), false],
    ["", false],
    ["Abcdef1!" + "a".repeat(64), true],
    ["Abcdef1!" + "a".repeat(65), false],
    ["Abcdef1!" + "á".repeat(33), false],
  ];
  for (const [password, valido] of casos) {
    const valores = { password, confirmPassword: password };
    assert.equal(!errorPassword(password), valido, password);
    assert.equal(!validarNuevaPassword(valores).password, valido, password);
    assert.equal(
      !validarRegistro({ ...registro, ...valores }).password,
      valido,
      password,
    );
    if (valido) assert.equal(validarPassword(password), password);
    else assert.throws(() => validarPassword(password), password);
  }
  assert.ok(
    validarNuevaPassword({
      password: registro.password,
      confirmPassword: "otra",
    }).confirmPassword,
  );
  assert.deepEqual(
    validarLogin({ email: "ana@example.test", password: "clave-anterior" }),
    {},
  );
});

test("ciudades: se guarda el registro canónico, sin confiar en el texto del cliente", () => {
  assert.deepEqual(validarCiudad("1384"), {
    ciudadId: 1384,
    ciudad: "Rosario",
    pais: "AR",
  });
  assert.equal(obtenerUbicacion(1384)?.provinciaId, 3641);
  assert.equal(
    obtenerUbicacion(1384)?.ubicacion,
    "Rosario, Santa Fe, Argentina",
  );
  assert.ok(obtenerCiudades("AR", 3641).some((ciudad) => ciudad.id === 1384));
  assert.throws(() => obtenerCiudades("CL", 3641));
  for (const id of [true, "Rosario", "1384x", -1, 1.5, 999999999, {}, [1384]])
    assert.throws(() => validarCiudad(id));
  assert.deepEqual(validarCiudad(""), {
    ciudadId: null,
    ciudad: null,
    pais: null,
  });
});
