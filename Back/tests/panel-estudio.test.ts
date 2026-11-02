import assert from "node:assert/strict";
import { test } from "node:test";
import { crearPanelEstudio } from "../../Front/src/mocks/panel-estudio.js";
import {
  asignarConsulta,
  cerrarConsulta,
  cerrarVencidas,
  erroresCitaEstudio,
  propuestasDisponibles,
  validarCambioIntegrante,
  validarPropuesta,
} from "../../Front/src/lib/panel-estudio.js";

const ahora = new Date("2030-05-10T12:00:00");
const crear = () => crearPanelEstudio("2030-05-10");
test("estudio: una propuesta espera al cierre y luego asigna su artista", () => {
  const { consultas, equipo } = crear();
  const consulta = consultas[0];
  assert.equal(consulta.estado, "ABIERTA");
  assert.equal(consulta.artistaId, null);
  const cerrada = cerrarConsulta(consulta, equipo, ahora);
  assert.equal(cerrada.estado, "ASIGNADA");
  assert.equal(cerrada.artistaId, consulta.propuestas[0].artistaId);
  assert.equal(cerrada.asignadaPor, "UNICA_PROPUESTA");
  assert.equal(consulta.estado, "ABIERTA");
  assert.equal(cerrarConsulta(cerrada, equipo, ahora), cerrada);
});
test("estudio: sin propuestas requiere asignación y con varias elige el cliente", () => {
  const { consultas, equipo } = crear();
  assert.equal(
    cerrarConsulta(consultas[5], equipo, ahora).estado,
    "POR_ASIGNAR",
  );
  assert.equal(
    cerrarConsulta(consultas[1], equipo, ahora).estado,
    "ELECCION_CLIENTE",
  );
});
test("estudio: el plazo cierra solo consultas abiertas y conserva asignaciones", () => {
  const { consultas, equipo } = crear();
  consultas[0].cierre = "2030-05-10T11:59:00";
  consultas[1].cierre = "2030-05-10T12:01:00";
  const resultado = cerrarVencidas(consultas, equipo, ahora);
  assert.equal(resultado[0].estado, "ASIGNADA");
  assert.equal(resultado[1], consultas[1]);
  assert.equal(resultado[4], consultas[4]);
  assert.equal(cerrarVencidas(resultado, equipo, ahora), resultado);
});
test("estudio: propuestas vencidas, suspendidas o de baja no participan en la elección", () => {
  const { consultas, equipo } = crear();
  const c = consultas[1];
  equipo.find((a) => a.id === c.propuestas[0].artistaId).estado = "SUSPENDIDO";
  assert.equal(propuestasDisponibles(c, equipo, ahora).length, 1);
  c.propuestas[1].validez = "2030-05-09";
  assert.equal(cerrarConsulta(c, equipo, ahora).estado, "POR_ASIGNAR");
});
test("estudio: el titular puede asignar sin propuestas, el cliente solo al cerrar y entre opciones válidas", () => {
  const { consultas, equipo } = crear();
  assert.equal(
    asignarConsulta(consultas[5], "artista-1", equipo, "ESTUDIO", ahora).estado,
    "ASIGNADA",
  );
  assert.throws(() =>
    asignarConsulta(consultas[1], "artista-2", equipo, "CLIENTE", ahora),
  );
  const c = cerrarConsulta(consultas[1], equipo, ahora);
  assert.equal(
    asignarConsulta(c, "artista-2", equipo, "CLIENTE", ahora).asignadaPor,
    "CLIENTE",
  );
  assert.throws(() =>
    asignarConsulta(c, "artista-1", equipo, "CLIENTE", ahora),
  );
  assert.throws(() =>
    asignarConsulta(c, "artista-4", equipo, "ESTUDIO", ahora),
  );
  assert.throws(() =>
    asignarConsulta(
      { ...c, estado: "ARCHIVADA" },
      "artista-1",
      equipo,
      "ESTUDIO",
      ahora,
    ),
  );
});
test("estudio: solo artistas activos pueden proponer antes del cierre", () => {
  const { consultas, equipo } = crear();
  const c = consultas[0],
    p = c.propuestas[0];
  assert.equal(validarPropuesta(c, p, equipo, ahora), "");
  assert.match(
    validarPropuesta(c, { ...p, artistaId: "artista-4" }, equipo, ahora),
    /activos/,
  );
  assert.match(
    validarPropuesta({ ...c, cierre: ahora.toISOString() }, p, equipo, ahora),
    /cerrada/,
  );
  assert.match(
    validarPropuesta(c, { ...p, sena: p.importe + 1 }, equipo, ahora),
    /seña/,
  );
});
test("agenda del estudio: permite simultáneos entre artistas e impide el cruce del mismo artista", () => {
  const { citas, equipo } = crear();
  const cita = { ...citas[0], id: "nueva" };
  assert.ok(erroresCitaEstudio(cita, citas, equipo).hora);
  assert.equal(
    erroresCitaEstudio({ ...cita, artistaId: "artista-2" }, [citas[0]], equipo)
      .hora,
    undefined,
  );
  assert.equal(
    erroresCitaEstudio(citas[0], citas, equipo, citas[0].id).hora,
    undefined,
  );
  assert.ok(
    erroresCitaEstudio({ ...cita, artistaId: "artista-4" }, [], equipo)
      .artistaId,
  );
});
test("equipo: no elimina integrantes con turnos próximos y mantiene el historial", () => {
  const { citas } = crear();
  assert.match(
    validarCambioIntegrante("artista-1", "ELIMINADO", citas, "2030-05-10"),
    /Reasigná/,
  );
  assert.equal(
    validarCambioIntegrante("artista-1", "SUSPENDIDO", citas, "2030-05-10"),
    "",
  );
  assert.equal(
    validarCambioIntegrante("artista-4", "ELIMINADO", citas, "2030-05-10"),
    "",
  );
});
test("datos del estudio: referencias válidas e instancias independientes", () => {
  const d = crear(),
    ids = new Set(d.equipo.map((a) => a.id)),
    clientes = new Set(d.clientes.map((c) => c.id));
  for (const c of d.citas) {
    assert.ok(ids.has(c.artistaId));
    assert.ok(clientes.has(c.clienteId));
  }
  for (const c of d.consultas) {
    assert.ok(clientes.has(c.clienteId));
    for (const p of c.propuestas) assert.ok(ids.has(p.artistaId));
  }
  d.equipo[0].nombre = "Otro nombre";
  assert.notEqual(crear().equipo[0].nombre, "Otro nombre");
});

test("equipo: la baja exige resolver los proyectos asignados aunque no tengan turno", () => {
  const d = crear();
  assert.match(
    validarCambioIntegrante(
      "artista-2",
      "ELIMINADO",
      [],
      "2030-05-10",
      d.consultas,
    ),
    /consultas/,
  );
});
