import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPanelEjemplo } from "../../Front/src/mocks/panel-artista.js";
import {
  estadisticasMes,
  evolucionFacturacion,
  mesValido,
  moverMes,
} from "../../Front/src/lib/estadisticas-artista.js";

test("estadísticas: una asignación sin propuesta no cuenta como presupuesto", () => {
  const datos = crearPanelEjemplo("2026-11-12");
  datos.consultas = [
    { ...datos.consultas[0]!, estado: "PRESUPUESTADA", presupuesto: undefined },
  ];
  assert.equal(estadisticasMes(datos, "2026-11").presupuestadas, 0);
  datos.consultas[0]!.presupuesto = {
    importe: 90000,
    sena: 20000,
    validez: "2026-12-01",
    detalle: "Diseño y sesión",
  };
  assert.equal(estadisticasMes(datos, "2026-11").presupuestadas, 1);
});

test("estadísticas: factura sesiones completadas sin duplicar señas o clientes", () => {
  const datos = crearPanelEjemplo("2026-11-12");
  const base = datos.citas[0];
  datos.citas = [
    {
      ...base,
      id: "anterior",
      fecha: "2026-10-31",
      clienteId: "cliente-1",
      estado: "COMPLETADA",
    },
    {
      ...base,
      id: "a",
      fecha: "2026-11-01",
      clienteId: "cliente-1",
      importe: 90000,
      sena: 30000,
      duracion: 60,
      estado: "COMPLETADA",
    },
    {
      ...base,
      id: "b",
      fecha: "2026-11-30",
      clienteId: "cliente-1",
      importe: 60000,
      sena: 20000,
      duracion: 90,
      estado: "COMPLETADA",
    },
    {
      ...base,
      id: "c",
      fecha: "2026-11-10",
      clienteId: "cliente-2",
      importe: 30000,
      sena: 10000,
      duracion: 30,
      estado: "COMPLETADA",
    },
    {
      ...base,
      id: "d",
      fecha: "2026-11-11",
      importe: 500000,
      estado: "CANCELADA",
    },
    {
      ...base,
      id: "e",
      fecha: "2026-11-12",
      importe: 500000,
      estado: "CONFIRMADA",
    },
    {
      ...base,
      id: "siguiente",
      fecha: "2026-12-01",
      importe: 500000,
      estado: "COMPLETADA",
    },
  ];
  const resumen = estadisticasMes(datos, "2026-11");
  assert.equal(resumen.facturacion, 180000);
  assert.equal(resumen.ticketPromedio, 60000);
  assert.equal(resumen.clientes, 2);
  assert.equal(resumen.nuevos, 1);
  assert.equal(resumen.recurrentes, 1);
  assert.equal(resumen.horas, 3);
  assert.equal(resumen.turnos, 5);
  assert.equal(resumen.cancelados, 1);
  assert.deepEqual(resumen.porCliente[0], {
    clienteId: "cliente-1",
    sesiones: 2,
    importe: 150000,
  });
  assert.equal(
    resumen.estados.reduce((total, item) => total + item.cantidad, 0),
    resumen.turnos,
  );
});

test("estadísticas: filtra canales por fecha de recepción y admite meses sin actividad", () => {
  const datos = crearPanelEjemplo("2026-11-01");
  const resumen = estadisticasMes(datos, "2026-11");
  assert.equal(resumen.consultas, 1);
  assert.equal(
    resumen.canales.find((canal) => canal.id === "INSTAGRAM")?.cantidad,
    1,
  );
  assert.equal(
    resumen.canales.find((canal) => canal.id === "WHATSAPP")?.cantidad,
    0,
  );
  const vacio = estadisticasMes(datos, "2025-01");
  assert.equal(vacio.facturacion, 0);
  assert.equal(vacio.ticketPromedio, 0);
  assert.equal(vacio.horas, 0);
  assert.equal(vacio.clientes, 0);
  assert.deepEqual(vacio.porCliente, []);
});

test("estadísticas: maneja el cambio de año y completa los seis meses del gráfico", () => {
  assert.equal(moverMes("2026-01", -1), "2025-12");
  assert.equal(moverMes("2025-12", 1), "2026-01");
  assert.equal(moverMes("2024-03", -1), "2024-02");
  assert.equal(mesValido("2026-00"), false);
  assert.equal(mesValido("2026-13"), false);
  assert.equal(mesValido("hola"), false);
  assert.equal(mesValido("2026-02"), true);
  const datos = crearPanelEjemplo("2026-11-01");
  const evolucion = evolucionFacturacion(datos, "2026-01");
  assert.deepEqual(
    evolucion.map((item) => item.mes),
    ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"],
  );
  assert.ok(evolucion.every((item) => item.importe === 0));
  assert.throws(() => estadisticasMes(datos, "2026-13"), /Mes inválido/);
});
