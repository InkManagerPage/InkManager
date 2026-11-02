import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPanelEjemplo } from "../../Front/src/mocks/panel-artista.js";
import {
  fechaLocal,
  horaFin,
  inicioSemana,
  moverFecha,
  validarCita,
  validarPresupuesto,
} from "../../Front/src/lib/panel-artista.js";

test("agenda: impide solapamientos y permite sesiones consecutivas", () => {
  const panel = crearPanelEjemplo("2026-11-01");
  const cita = panel.citas[0];
  assert.match(
    validarCita({ ...cita, hora: "12:00" }, panel.citas),
    /ese horario/,
  );
  assert.equal(
    validarCita({ ...cita, hora: "14:00", duracion: 120 }, panel.citas),
    "",
  );
  assert.equal(validarCita(cita, panel.citas, cita.id), "");
  assert.equal(validarCita({ ...cita, estado: "CANCELADA" }, panel.citas), "");
  assert.equal(
    validarCita(
      cita,
      panel.citas.map((item) => ({ ...item, estado: "CANCELADA" })),
    ),
    "",
  );
});

test("agenda: valida fechas, duración, fin del día e importes", () => {
  const cita = crearPanelEjemplo("2026-11-01").citas[0];
  for (const cambio of [
    { fecha: "2026-02-30" },
    { fecha: "" },
    { hora: "25:30" },
    { duracion: 0 },
    { duracion: 481 },
    { hora: "23:00", duracion: 120 },
    { importe: -1 },
    { sena: cita.importe + 1 },
    { importe: NaN },
  ]) {
    assert.notEqual(
      validarCita({ ...cita, ...cambio }, []),
      "",
      JSON.stringify(cambio),
    );
  }
});

test("presupuesto: exige importe, seña coherente, detalle y vencimiento válido", () => {
  const presupuesto = {
    importe: 138000,
    sena: 35000,
    detalle: "Diseño y sesión de dos horas.",
    validez: moverFecha(fechaLocal(new Date()), 15),
  };
  assert.equal(validarPresupuesto(presupuesto), "");
  for (const cambio of [
    { importe: 0 },
    { sena: -1 },
    { sena: 200000 },
    { detalle: "corto" },
    { validez: "2000-01-01" },
    { validez: "2999-02-30" },
    { importe: Infinity },
  ]) {
    assert.notEqual(validarPresupuesto({ ...presupuesto, ...cambio }), "");
  }
});

test("fechas locales: semana desde lunes y cambios de mes y año", () => {
  assert.equal(inicioSemana("2026-11-01"), "2026-10-26");
  assert.equal(inicioSemana("2026-11-02"), "2026-11-02");
  assert.equal(moverFecha("2026-12-31", 1), "2027-01-01");
  assert.equal(horaFin("10:45", 90), "12:15");
});

test("datos de ejemplo: referencias consistentes y presupuestos independientes", () => {
  const panel = crearPanelEjemplo("2026-11-01");
  const clientes = new Set(panel.clientes.map((item) => item.id));
  for (const item of [
    ...panel.consultas,
    ...panel.citas,
    ...panel.conversaciones,
  ])
    assert.ok(clientes.has(item.clienteId));
  for (const consulta of panel.consultas)
    if (consulta.estado === "PRESUPUESTADA") assert.ok(consulta.presupuesto);
  panel.clientes[0].nombre = "Nombre modificado";
  assert.equal(
    crearPanelEjemplo("2026-11-01").clientes[0].nombre,
    "Sofía Aguirre",
  );
});
