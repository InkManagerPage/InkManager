import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarCambioEquipo,
  validarIngreso,
  validarDesvinculacion,
} from "../src/equipo/equipo.validation.js";
import {
  validarEmailInvitacion,
  validarAccionInvitacion,
  comprobarInvitacion,
} from "../src/invitaciones-equipo/invitaciones-equipo.validation.js";
import {
  presentarInvitacion,
  type InvitacionCompleta,
} from "../src/invitaciones-equipo/invitaciones-equipo.entity.js";
import type { CuentaEquipo } from "../src/equipo/equipo.entity.js";
const cuenta: CuentaEquipo = {
  id: "artista",
  email: "artista@example.test",
  rol: "ARTISTA",
  emailVerificado: true,
  estudioId: null,
  estadoEnEstudio: "ACTIVO",
  versionEquipo: 2,
  zonaHoraria: "UTC",
};
const ahora = new Date("2030-11-02T12:00:00Z");
const invitacion = {
  id: "inv",
  estudioId: "estudio",
  estudio: { nombre: "Taller" },
  email: cuenta.email,
  estado: "PENDIENTE",
  estadoEnvio: "ENVIADA",
  version: 0,
  createdAt: ahora,
  ultimoIntentoAt: new Date("2030-11-02T11:58:00Z"),
  expiraAt: new Date("2030-11-09T12:00:00Z"),
  enviadaAt: ahora,
} as InvitacionCompleta;
test("equipo: solo admite acciones conocidas y versiones enteras", () => {
  assert.deepEqual(validarCambioEquipo({ accion: "SUSPENDER", version: 2 }), {
    accion: "SUSPENDER",
    version: 2,
  });
  for (const b of [
    { accion: "BORRAR", version: 0 },
    { accion: "SUSPENDER", version: -1 },
    { accion: "HABILITAR", version: 0.5 },
    { accion: "DESVINCULAR" },
  ])
    assert.throws(() => validarCambioEquipo(b));
});
test("equipo: incorporarse exige cuenta de artista, email verificado y una sola modalidad", () => {
  assert.doesNotThrow(() =>
    validarIngreso(cuenta, { turnos: 0, consultas: 0 }),
  );
  for (const c of [
    { ...cuenta, rol: "CLIENTE" as const },
    { ...cuenta, emailVerificado: false },
    { ...cuenta, estudioId: "otro" },
  ])
    assert.throws(() => validarIngreso(c, { turnos: 0, consultas: 0 }));
});
test("equipo: ingresar y desvincular requieren resolver turnos y consultas", () => {
  for (const pendientes of [
    { turnos: 1, consultas: 0 },
    { turnos: 0, consultas: 1 },
    { turnos: 2, consultas: 3 },
  ]) {
    assert.throws(() => validarIngreso(cuenta, pendientes));
    assert.throws(() => validarDesvinculacion(pendientes));
  }
  assert.doesNotThrow(() => validarDesvinculacion({ turnos: 0, consultas: 0 }));
});
test("invitaciones: normaliza el email y rechaza entradas inválidas", () => {
  assert.equal(
    validarEmailInvitacion({ email: " Artista@Example.test " }),
    "artista@example.test",
  );
  for (const b of [
    null,
    [],
    {},
    { email: "sin-arroba" },
    { email: "x".repeat(255) + "@example.test" },
  ])
    assert.throws(() => validarEmailInvitacion(b));
  assert.throws(() =>
    validarAccionInvitacion({ accion: "ACEPTAR", version: 0 }, [
      "CANCELAR",
      "REENVIAR",
    ]),
  );
});
test("invitaciones: solo se responde una pendiente vigente y con la versión actual", () => {
  assert.doesNotThrow(() => comprobarInvitacion(invitacion, 0, ahora));
  assert.throws(() => comprobarInvitacion(invitacion, 1, ahora));
  assert.throws(() =>
    comprobarInvitacion({ ...invitacion, expiraAt: ahora }, 0, ahora),
  );
  for (const estado of [
    "CANCELADA",
    "ACEPTADA",
    "RECHAZADA",
    "VENCIDA",
  ] as const)
    assert.throws(() =>
      comprobarInvitacion({ ...invitacion, estado }, 0, ahora),
    );
});
test("invitaciones: muestra vencimientos y espera un minuto antes de reenviar", () => {
  assert.equal(presentarInvitacion(invitacion, ahora).puedeReenviar, true);
  assert.equal(
    presentarInvitacion({ ...invitacion, ultimoIntentoAt: ahora }, ahora)
      .puedeReenviar,
    false,
  );
  const vencida = presentarInvitacion(
    { ...invitacion, expiraAt: ahora },
    ahora,
  );
  assert.equal(vencida.estado, "VENCIDA");
  assert.equal(vencida.puedeReenviar, false);
});
