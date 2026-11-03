import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarSemana,
  horarioPermitido,
  comprobarVersionDisponibilidad,
} from "../src/disponibilidad/disponibilidad.validation.js";
import { validarBloqueo } from "../src/bloqueos-agenda/bloqueos-agenda.validation.js";
import { presentarDisponibilidad } from "../src/disponibilidad/disponibilidad.entity.js";
import {
  semanaInicial,
  erroresSemana,
  erroresBloqueo,
  problemaReserva,
} from "../../Front/src/lib/disponibilidad.js";
import type { DisponibilidadAgenda } from "../../Front/src/types/disponibilidad.js";
const zona = "America/Argentina/Buenos_Aires";
const lunes = (desde: string, hasta: string) =>
  [
    new Date(`2030-11-04T${desde}:00-03:00`),
    new Date(`2030-11-04T${hasta}:00-03:00`),
  ] as const;
test("disponibilidad: exige días únicos y rangos válidos, sin superposición", () => {
  const semana = semanaInicial();
  assert.equal(validarSemana([...semana].reverse())[0]!.dia, 1);
  for (const valor of [
    [],
    null,
    semana.slice(0, 6),
    [...semana.slice(0, 6), semana[0]],
    semana.map((d) =>
      d.dia === 1 ? { ...d, rangos: [{ desde: "13:00", hasta: "12:00" }] } : d,
    ),
    semana.map((d) =>
      d.dia === 1
        ? {
            ...d,
            rangos: [
              { desde: "09:00", hasta: "13:00" },
              { desde: "12:00", hasta: "18:00" },
            ],
          }
        : d,
    ),
  ])
    assert.throws(() => validarSemana(valor));
  assert.equal(Object.keys(erroresSemana(semana)).length, 0);
  assert.ok(
    erroresSemana(
      semana.map((d) => ({
        ...d,
        rangos: [{ desde: "18:00", hasta: "09:00" }],
      })),
    )["1"],
  );
});
test("disponibilidad: permite varios rangos, respeta almuerzos y límites", () => {
  const semana = semanaInicial();
  semana[0]!.rangos = [
    { desde: "09:00", hasta: "13:00" },
    { desde: "15:00", hasta: "19:00" },
  ];
  assert.equal(
    horarioPermitido(semana, ...lunes("09:00", "13:00"), zona),
    true,
  );
  assert.equal(
    horarioPermitido(semana, ...lunes("12:00", "15:30"), zona),
    false,
  );
  assert.equal(
    horarioPermitido(semana, ...lunes("15:00", "19:00"), zona),
    true,
  );
  assert.equal(
    horarioPermitido(semana, ...lunes("18:00", "19:01"), zona),
    false,
  );
  assert.equal(
    horarioPermitido(semana, ...lunes("08:59", "10:00"), zona),
    false,
  );
  assert.equal(
    horarioPermitido(
      semana,
      new Date("2030-11-03T12:00:00Z"),
      new Date("2030-11-03T13:00:00Z"),
      zona,
    ),
    false,
  );
});
test("disponibilidad: rangos contiguos son continuos y medianoche pertenece al cierre", () => {
  const semana = semanaInicial();
  semana[0]!.rangos = [
    { desde: "09:00", hasta: "12:00" },
    { desde: "12:00", hasta: "24:00" },
  ];
  assert.equal(
    horarioPermitido(validarSemana(semana), ...lunes("11:00", "13:00"), zona),
    true,
  );
  assert.equal(
    horarioPermitido(
      semana,
      new Date("2030-11-04T22:00:00-03:00"),
      new Date("2030-11-05T00:00:00-03:00"),
      zona,
    ),
    true,
  );
  assert.equal(
    horarioPermitido(
      semana,
      new Date("2030-11-04T22:00:00-03:00"),
      new Date("2030-11-05T00:30:00-03:00"),
      zona,
    ),
    false,
  );
  assert.equal(
    horarioPermitido(semana, ...lunes("13:00", "11:00"), zona),
    false,
  );
});
const base = {
  motivo: "Vacaciones",
  desdeFecha: "2030-11-04",
  hastaFecha: "2030-11-06",
  desdeHora: "10:00",
  hastaHora: "13:00",
  diaCompleto: true,
  version: 0,
};
test("bloqueos: días completos incluyen la última fecha y se guardan en UTC", () => {
  const b = validarBloqueo(base, zona);
  assert.equal(b.inicioAt.toISOString(), "2030-11-04T03:00:00.000Z");
  assert.equal(b.finAt.toISOString(), "2030-11-07T03:00:00.000Z");
  const mismo = validarBloqueo({ ...base, hastaFecha: base.desdeFecha }, zona);
  assert.equal(
    (mismo.finAt.getTime() - mismo.inicioAt.getTime()) / 3600000,
    24,
  );
});
test("bloqueos: días completos respetan jornadas de 23 y 25 horas por cambio estacional", () => {
  const primavera = validarBloqueo(
    { ...base, desdeFecha: "2027-03-14", hastaFecha: "2027-03-14" },
    "America/New_York",
  );
  const invierno = validarBloqueo(
    { ...base, desdeFecha: "2027-11-07", hastaFecha: "2027-11-07" },
    "America/New_York",
  );
  assert.equal(
    (primavera.finAt.getTime() - primavera.inicioAt.getTime()) / 3600000,
    23,
  );
  assert.equal(
    (invierno.finAt.getTime() - invierno.inicioAt.getTime()) / 3600000,
    25,
  );
});
test("bloqueos: valida fechas reales, duración, horas y cambios estacionales", () => {
  for (const cambio of [
    { motivo: "" },
    { motivo: "a".repeat(121) },
    { desdeFecha: "2030-02-30" },
    { hastaFecha: "2030-11-03" },
    { diaCompleto: "si" },
    {
      diaCompleto: false,
      hastaFecha: base.desdeFecha,
      desdeHora: "13:00",
      hastaHora: "12:00",
    },
    { diaCompleto: false, desdeHora: "24:00" },
  ])
    assert.throws(() => validarBloqueo({ ...base, ...cambio }, zona));
  assert.throws(() =>
    validarBloqueo(
      {
        ...base,
        diaCompleto: false,
        desdeFecha: "2027-03-14",
        hastaFecha: "2027-03-14",
        desdeHora: "02:30",
        hastaHora: "04:00",
      },
      "America/New_York",
    ),
  );
  assert.throws(() =>
    validarBloqueo(
      {
        ...base,
        diaCompleto: false,
        desdeFecha: "2027-11-07",
        hastaFecha: "2027-11-07",
        desdeHora: "01:30",
        hastaHora: "04:00",
      },
      "America/New_York",
    ),
  );
  assert.equal(Object.keys(erroresBloqueo(base)).length, 0);
  assert.ok(erroresBloqueo({ ...base, hastaFecha: "2030-11-03" }).hastaFecha);
});
test("agenda: prevalidación respeta horarios, bloques y límites contiguos", () => {
  const datos = {
    semana: semanaInicial(),
    bloqueos: [
      {
        desdeFecha: "2030-11-04",
        hastaFecha: "2030-11-04",
        desdeHora: "12:00",
        hastaHora: "13:00",
        diaCompleto: false,
      },
    ],
  } as DisponibilidadAgenda;
  assert.equal(problemaReserva(datos, "2030-11-04", "11:00", 60), "");
  assert.match(problemaReserva(datos, "2030-11-04", "11:30", 60), /bloqueo/);
  assert.equal(problemaReserva(datos, "2030-11-04", "13:00", 60), "");
  assert.match(
    problemaReserva({ ...datos, semana: null }, "2030-11-04", "10:00", 60),
    /Configurá/,
  );
  assert.match(
    problemaReserva(
      { ...datos, bloqueos: [{ ...datos.bloqueos[0]!, diaCompleto: true }] },
      "2030-11-04",
      "10:00",
      60,
    ),
    /bloqueo/,
  );
});
test("disponibilidad: versión obsoleta no sobrescribe y la lectura inicial no inventa horarios", () => {
  assert.doesNotThrow(() => comprobarVersionDisponibilidad(2, 2));
  assert.throws(() => comprobarVersionDisponibilidad(2, 1));
  const d = presentarDisponibilidad(
    null,
    {
      id: "artista",
      nombre: "Artista",
      nombreArtistico: null,
      estadoEnEstudio: "ACTIVO",
    },
    zona,
    true,
  );
  assert.equal(d.version, 0);
  assert.equal(d.semana, null);
  assert.deepEqual(d.bloqueos, []);
});
