import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPanelEjemplo } from "../../Front/src/mocks/panel-artista.js";
import {
  cantidad,
  erroresCita,
  erroresCliente,
  erroresPresupuesto,
  moverFecha,
} from "../../Front/src/lib/panel-artista.js";
import {
  erroresReglaCorreo,
  motivoRecordatorio,
} from "../../Front/src/lib/recordatorios.js";

test("contactos: admite nombres completos largos sin cambiar las cuentas de acceso", () => {
  const cliente = {
    ...crearPanelEjemplo().clientes[0],
    nombre: "María de los Ángeles Fernández",
  };
  assert.deepEqual(erroresCliente(cliente), {});
  assert.deepEqual(
    erroresCliente({ ...cliente, nombre: "Ana O'Connor-López" }),
    {},
  );
  assert.ok(erroresCliente({ ...cliente, nombre: "a".repeat(81) }).nombre);
  assert.ok(erroresCliente({ ...cliente, nombre: "Ana 123" }).nombre);
  assert.ok(erroresCliente(cliente, [cliente], "otro-id").email);
  assert.deepEqual(erroresCliente(cliente, [cliente], cliente.id), {});
});

test("formularios: devuelve errores por campo y conserva los controles de agenda", () => {
  const datos = crearPanelEjemplo();
  const cita = { ...datos.citas[0], titulo: "", clienteId: "", sena: 9999999 };
  const errores = erroresCita(cita, datos.citas);
  assert.ok(errores.titulo);
  assert.ok(errores.clienteId);
  assert.ok(errores.sena);
  assert.ok(errores.hora);
  assert.deepEqual(
    erroresCita(datos.citas[0], datos.citas, datos.citas[0].id),
    {},
  );
  const presupuesto = erroresPresupuesto({
    importe: 100,
    sena: 200,
    validez: moverFecha(datos.citas[0].fecha, 15),
    detalle: "x",
  });
  assert.ok(presupuesto.sena);
  assert.ok(presupuesto.detalle);
});

test("recordatorios: explica la regla efectiva cuando hay excepciones", () => {
  const datos = crearPanelEjemplo();
  const id = datos.clientes[0].id;
  datos.clientes[0].recordatorios = { TURNO: false };
  assert.match(
    motivoRecordatorio(datos, id, "TURNO", {}, true),
    /preferencia del cliente/,
  );
  assert.match(
    motivoRecordatorio(datos, id, "TURNO", { TURNO: true }, true),
    /Activado para esta sesión/,
  );
  datos.recordatorios.clientesHabilitados = false;
  assert.match(
    motivoRecordatorio(datos, id, "TURNO", { TURNO: true }, true),
    /correos para clientes desactivados/,
  );
});

test("recordatorios: informa varios campos inválidos al mismo tiempo", () => {
  const regla = crearPanelEjemplo().recordatorios.reglas.TURNO;
  const errores = erroresReglaCorreo("TURNO", {
    ...regla,
    horas: -1,
    asunto: "",
    mensaje: "",
  });
  assert.ok(errores.horas);
  assert.ok(errores.asunto);
  assert.ok(errores.mensaje);
});

test("cantidades: presenta singular y plural sin ambigüedad", () => {
  assert.equal(cantidad(1, "consulta"), "1 consulta");
  assert.equal(cantidad(0, "turno"), "0 turnos");
  assert.equal(
    cantidad(2, "conversación", "conversaciones"),
    "2 conversaciones",
  );
});
