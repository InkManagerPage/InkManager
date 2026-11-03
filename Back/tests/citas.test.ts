import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarCita,
  validarTransicion,
} from "../src/citas/citas.validation.js";
import { filtroCitas } from "../src/citas/citas.repository.js";
import {
  crearFormularioCita,
  erroresFormularioCita,
  relojEnZona,
} from "../../Front/src/lib/agenda.js";
import type { AmbitoConsultas } from "../src/solicitudes/solicitudes.entity.js";
import type { BandejaConsultas } from "../../Front/src/types/consultas.js";
import type { CitaGuardada } from "../../Front/src/types/citas.js";

const zona = "America/Argentina/Buenos_Aires";
const solicitudId = "af102026-1102-4000-8000-000000004000";
const entrada = {
  solicitudId,
  titulo: "Rama de olivo",
  fecha: "2030-11-02",
  hora: "10:00",
  duracion: 120,
  importe: 120000.5,
  sena: 20000,
  estado: "PENDIENTE",
  notas: "",
  recordatorios: { TURNO: false },
};
const ambito: AmbitoConsultas = {
  email: "artista@example.test",
  emailVerificado: true,
  usuarioId: "artista",
  estudioId: "estudio",
  tipo: "ESTUDIO",
  nombre: "Estudio",
  administra: false,
  puedeProponer: true,
  zonaHoraria: zona,
};

test("turnos: guarda instantes UTC a partir de la zona del negocio", () => {
  const cita = validarCita(entrada, zona);
  assert.equal(cita.inicioAt.toISOString(), "2030-11-02T13:00:00.000Z");
  assert.equal(cita.finAt.toISOString(), "2030-11-02T15:00:00.000Z");
  assert.equal(cita.importe, 120000.5);
  assert.deepEqual(cita.recordatorios, { TURNO: false });
  assert.deepEqual(relojEnZona(zona, cita.inicioAt), {
    fecha: "2030-11-02",
    hora: "10:00",
  });
});
test("turnos: rechaza fechas inexistentes y horas ambiguas por cambio de horario", () => {
  assert.throws(() => validarCita({ ...entrada, fecha: "2030-02-30" }, zona));
  assert.throws(() =>
    validarCita(
      { ...entrada, fecha: "2027-03-14", hora: "02:30" },
      "America/New_York",
    ),
  );
  assert.throws(() =>
    validarCita(
      { ...entrada, fecha: "2027-11-07", hora: "01:30" },
      "America/New_York",
    ),
  );
  assert.throws(() => validarCita(entrada, "Zona/Inexistente"));
});
test("turnos: valida duración, dinero, estados y excepciones de correo", () => {
  for (const cambio of [
    { duracion: 29 },
    { duracion: 481 },
    { duracion: 30.5 },
    { hora: "24:00" },
    { hora: "23:00" },
    { importe: -1 },
    { importe: 2.123 },
    { importe: Infinity },
    { sena: 130000 },
    { sena: "10" },
    { recordatorios: { TURNO: "si" } },
    { recordatorios: { ADMIN: true } },
    { notas: "a".repeat(1001) },
    { estado: "BORRADO" },
    { solicitudId: "otro" },
    { titulo: "ab" },
  ])
    assert.throws(
      () => validarCita({ ...entrada, ...cambio }, zona),
      JSON.stringify(cambio),
    );
  assert.equal(
    validarCita({ ...entrada, hora: "22:00" }, zona).finAt.toISOString(),
    "2030-11-03T03:00:00.000Z",
  );
});
test("turnos: solo completa una sesión confirmada que ya comenzó", () => {
  const ahora = new Date("2030-11-02T15:00:00Z");
  const pasado = new Date("2030-11-02T13:00:00Z");
  assert.doesNotThrow(() =>
    validarTransicion("CONFIRMADA", "COMPLETADA", pasado, ahora),
  );
  assert.throws(() =>
    validarTransicion("PENDIENTE", "COMPLETADA", pasado, ahora),
  );
  assert.throws(() =>
    validarTransicion(
      "CONFIRMADA",
      "COMPLETADA",
      new Date("2030-11-03"),
      ahora,
    ),
  );
  for (const estado of ["CANCELADA", "COMPLETADA"])
    assert.throws(() => validarTransicion(estado, "CONFIRMADA", pasado, ahora));
});
test("turnos: el titular ve el estudio; los artistas solo su agenda", () => {
  assert.deepEqual(filtroCitas(ambito), {
    solicitud: { estudioId: "estudio" },
    artistaId: "artista",
  });
  assert.deepEqual(filtroCitas({ ...ambito, administra: true }), {
    solicitud: { estudioId: "estudio" },
  });
  assert.deepEqual(
    filtroCitas({
      ...ambito,
      tipo: "INDEPENDIENTE",
      estudioId: null,
      administra: true,
    }),
    {
      solicitud: { artistaDestinoId: "artista", estudioId: null },
      artistaId: "artista",
    },
  );
});
function bandeja(): BandejaConsultas {
  return {
    contexto: ambito,
    clientes: [],
    equipo: [],
    citas: [],
    consultas: [
      {
        id: solicitudId,
        clienteId: "cliente",
        artistaId: "artista",
        titulo: "Olivo",
        estado: "ASIGNADA",
        version: 3,
        propuestas: [{ artistaId: "artista", importe: 120000, sena: 20000 }],
      },
    ],
  } as unknown as BandejaConsultas;
}
test("agenda: toma el presupuesto una sola vez y conserva versión e idempotencia", () => {
  const datos = bandeja();
  const primera = crearFormularioCita(datos, solicitudId, "2030-11-02");
  assert.equal(primera.importe, 120000);
  assert.equal(primera.versionConsulta, 3);
  assert.equal(primera.sesionAdicional, false);
  assert.match(primera.claveCreacion, /^[a-f\d-]{36}$/);
  datos.citas = [{ solicitudId, estado: "CONFIRMADA" }] as CitaGuardada[];
  const adicional = crearFormularioCita(datos, solicitudId, "2030-11-03");
  assert.equal(adicional.importe, 0);
  assert.equal(adicional.sena, 0);
  assert.equal(adicional.sesionAdicional, true);
  datos.citas[0]!.estado = "CANCELADA";
  assert.equal(
    crearFormularioCita(datos, solicitudId, "2030-11-03").sesionAdicional,
    false,
  );
});
test("agenda: valida permisos de consulta y cruces propios, permite turnos consecutivos", () => {
  const datos = bandeja();
  const v = crearFormularioCita(datos, solicitudId, "2030-11-02");
  datos.citas = [
    {
      id: "previa",
      solicitudId,
      artistaId: "artista",
      fecha: v.fecha,
      hora: "10:00",
      duracion: 120,
      estado: "CONFIRMADA",
    },
  ] as CitaGuardada[];
  assert.ok(erroresFormularioCita(v, datos).hora);
  assert.equal(
    erroresFormularioCita({ ...v, hora: "12:00" }, datos).hora,
    undefined,
  );
  assert.equal(
    erroresFormularioCita({ ...v, estado: "CANCELADA" }, datos).hora,
    undefined,
  );
  datos.contexto = { ...datos.contexto, usuarioId: "otro" };
  assert.ok(erroresFormularioCita(v, datos).solicitudId);
});
