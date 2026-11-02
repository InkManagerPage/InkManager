import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPanelEjemplo } from "../../Front/src/mocks/panel-artista.js";
import { contarCanales } from "../../Front/src/lib/canales-consulta.js";
import {
  recordatorioHabilitado,
  reemplazarVariables,
  validarRecordatorios,
  validarReglaCorreo,
} from "../../Front/src/lib/recordatorios.js";
import { recuperarPanel } from "../../Front/src/lib/panel-storage.js";

test("canales: cuenta el medio de recepción, independientemente de la asignación al estudio", () => {
  const datos = crearPanelEjemplo();
  assert.deepEqual(
    contarCanales(datos.consultas).map((item) => [item.id, item.cantidad]),
    [
      ["INSTAGRAM", 2],
      ["WHATSAPP", 2],
      ["TIKTOK", 1],
      ["FACEBOOK", 1],
    ],
  );
  assert.deepEqual(
    contarCanales(
      datos.consultas.map((item) => ({ ...item, origen: "Estudio" })),
    ),
    contarCanales(datos.consultas),
  );
  assert.equal(contarCanales([]).length, 4);
});

test("recordatorios: la configuración inicial y los horarios alternativos son válidos", () => {
  const config = crearPanelEjemplo().recordatorios;
  assert.equal(validarRecordatorios(config), "");
  assert.equal(
    validarReglaCorreo("TURNO", { ...config.reglas.TURNO, horas: 48 }),
    "",
  );
  assert.equal(
    validarReglaCorreo("CUIDADOS", { ...config.reglas.CUIDADOS, horas: 0 }),
    "",
  );
  assert.equal(
    validarReglaCorreo("AGENDA", {
      ...config.reglas.AGENDA,
      momentoAgenda: "MISMO_DIA",
      hora: "08:00",
    }),
    "",
  );
});

test("recordatorios: rechaza plazos inválidos, asuntos vacíos y variables que no corresponden", () => {
  const config = crearPanelEjemplo().recordatorios;
  assert.ok(validarReglaCorreo("TURNO", { ...config.reglas.TURNO, horas: 0 }));
  assert.ok(
    validarReglaCorreo("RESENA", { ...config.reglas.RESENA, dias: 31 }),
  );
  assert.ok(
    validarReglaCorreo("CUIDADOS", { ...config.reglas.CUIDADOS, horas: -1 }),
  );
  assert.ok(
    validarReglaCorreo("AGENDA", { ...config.reglas.AGENDA, hora: "25:01" }),
  );
  assert.ok(
    validarReglaCorreo("RESUMEN_SEMANAL", {
      ...config.reglas.RESUMEN_SEMANAL,
      diaSemana: 7,
    }),
  );
  assert.ok(
    validarReglaCorreo("TURNO", { ...config.reglas.TURNO, asunto: "" }),
  );
  assert.ok(
    validarReglaCorreo("TURNO", {
      ...config.reglas.TURNO,
      mensaje: "Dato desconocido: {{password}}",
    }),
  );
  assert.ok(
    validarRecordatorios({ ...config, zonaHoraria: "Zona/Inexistente" }),
  );
});

test("plantillas: sustituye todas las variables y no interpreta contenido HTML", () => {
  assert.equal(
    reemplazarVariables(
      "Hola {{ cliente }}, tu turno es {{fecha}}. {{cliente}}",
      { cliente: "Ana", fecha: "mañana" },
    ),
    "Hola Ana, tu turno es mañana. Ana",
  );
  assert.equal(
    reemplazarVariables("{{cliente}}", { cliente: "<b>Ana</b>" }),
    "<b>Ana</b>",
  );
  assert.equal(reemplazarVariables("{{pendiente}}", {}), "{{pendiente}}");
});

test("excepciones: el turno tiene prioridad sobre el cliente y la regla general", () => {
  const datos = crearPanelEjemplo();
  const cita = datos.citas[0];
  const cliente = datos.clientes.find((item) => item.id === cita.clienteId)!;
  assert.equal(
    recordatorioHabilitado(datos, cliente.id, "TURNO", cita.id),
    true,
  );
  cliente.recordatorios = { TURNO: false };
  assert.equal(
    recordatorioHabilitado(datos, cliente.id, "TURNO", cita.id),
    false,
  );
  cita.recordatorios = { TURNO: true };
  assert.equal(
    recordatorioHabilitado(datos, cliente.id, "TURNO", cita.id),
    true,
  );
  delete cita.recordatorios.TURNO;
  assert.equal(
    recordatorioHabilitado(datos, cliente.id, "TURNO", cita.id),
    false,
  );
});

test("excepciones: cancelar un turno o desactivar el grupo impide el envío", () => {
  const datos = crearPanelEjemplo();
  const cita = datos.citas[0];
  cita.recordatorios = { TURNO: true, CUIDADOS: true, RESENA: true };
  datos.recordatorios.clientesHabilitados = false;
  assert.equal(
    recordatorioHabilitado(datos, cita.clienteId, "TURNO", cita.id),
    false,
  );
  datos.recordatorios.clientesHabilitados = true;
  assert.equal(
    recordatorioHabilitado(datos, "cliente-inexistente", "TURNO"),
    false,
  );
  cita.estado = "CANCELADA";
  assert.equal(
    recordatorioHabilitado(datos, cita.clienteId, "CUIDADOS", cita.id),
    false,
  );
  assert.equal(
    recordatorioHabilitado(datos, cita.clienteId, "RESENA", cita.id),
    false,
  );
});

test("migración: conserva consultas y notas anteriores y agrega recordatorios y suscripción", () => {
  const datos = crearPanelEjemplo();
  const {
    recordatorios: _recordatorios,
    suscripcion: _suscripcion,
    ...anteriores
  } = datos;
  anteriores.consultas[0].notas = "Conservar estas indicaciones.";
  const legado = {
    ...anteriores,
    version: 1,
    consultas: anteriores.consultas.map(({ canal: _canal, ...item }) => item),
    conversaciones: anteriores.conversaciones.map(
      ({ canal: _canal, ...item }) => item,
    ),
  };
  const actualizado = recuperarPanel(legado)!;
  assert.equal(actualizado.version, 2);
  assert.equal(actualizado.consultas[0].notas, "Conservar estas indicaciones.");
  assert.equal(actualizado.consultas[0].canal, "INSTAGRAM");
  assert.equal(validarRecordatorios(actualizado.recordatorios), "");
  assert.equal(actualizado.suscripcion.plan, "INDIVIDUAL");
  assert.equal(recuperarPanel(null), null);
  assert.equal(recuperarPanel({ version: 99 }), null);
});
