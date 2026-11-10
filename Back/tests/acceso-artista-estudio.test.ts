import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";

process.env.JWT_SECRET ??= "clave-local-de-pruebas-inkmanager-32-bytes";

const { prisma } = await import("../src/config/prisma.js");
const { periodoPlanVigente } = await import("../src/pagos/acceso-plan.js");
const { ambitoDeCuenta } = await import("../src/solicitudes/solicitudes.ambito.js");
const { obtenerEnlaceFormularioArtista } = await import("../src/solicitudes/solicitudes.service.js");
const { filtroCanal } = await import("../src/mensajes/mensajes.repository.js");
const { filtroConversaciones } = await import("../src/whatsapp/whatsapp.repository.js");
const { bandejaMensajes, puedeUsarMensajes } = await import("../src/mensajes/mensajes.service.js");
const { iniciarInstagram } = await import("../src/instagram/instagram.conexion.js");
const { anterioresA, presentarMensajes } = await import("../src/mensajes/historial-mensajes.js");

function reemplazar(t: TestContext, delegado: object, metodo: string, reemplazo: unknown) {
  const metodos = delegado as Record<string, unknown>;
  const original = metodos[metodo];
  metodos[metodo] = reemplazo;
  t.after(() => { metodos[metodo] = original; });
}

const estudio = { id: "estudio", nombre: "Estudio", propietarioId: "titular", zonaHoraria: "UTC" };
const artista = {
  id: "artista",
  rol: "ARTISTA" as const,
  nombre: "Artista",
  nombreArtistico: null,
  estudioId: null,
  estadoEnEstudio: "ACTIVO" as const,
  zonaHoraria: "UTC",
  email: "artista@example.test",
  emailVerificado: true,
  estudio: null,
};

test("el independiente solo usa su mensajería con un plan vigente", async (t) => {
  const ambito = ambitoDeCuenta(artista);
  let vigente = false;
  reemplazar(t, prisma.suscripcion, "findFirst", (consulta: {
    where: { usuarioId: string; plan: string; usuario: object };
  }) => {
    assert.equal(consulta.where.usuarioId, artista.id);
    assert.equal(consulta.where.plan, "INDIVIDUAL");
    assert.deepEqual(consulta.where.usuario, { rol: "ARTISTA", estudioId: null, suspendidoAt: null });
    return Promise.resolve(vigente ? { id: "plan" } : null);
  });
  assert.equal(await puedeUsarMensajes(ambito), false);
  assert.deepEqual(await bandejaMensajes(ambito), {
    conectado: false, administra: false, mostrarWhatsApp: false,
    requierePlanIndividual: true, conversaciones: [],
  });
  await assert.rejects(iniciarInstagram(ambito, "sesion"), { status: 403 });
  vigente = true;
  assert.equal(await puedeUsarMensajes(ambito), true);
});

test("un miembro activo usa el canal del estudio solo para sus consultas asignadas", async (t) => {
  reemplazar(t, prisma.suscripcion, "findFirst", () => assert.fail("No se debe consultar un plan personal"));
  const integrante = { ...artista, estudioId: estudio.id, estudio };
  const ambito = ambitoDeCuenta(integrante);
  assert.equal(await puedeUsarMensajes(ambito), true);
  assert.equal(await puedeUsarMensajes(ambitoDeCuenta({ ...integrante, estadoEnEstudio: "SUSPENDIDO" })), false);
  for (const filtro of [filtroCanal, filtroConversaciones]) {
    assert.deepEqual(filtro(ambito), {
      estudioId: estudio.id, solicitud: { artistaAsignadoId: artista.id },
    });
    assert.deepEqual(filtro(ambitoDeCuenta({
      ...integrante, id: estudio.propietarioId, rol: "ESTUDIO_ADMIN",
    })), { estudioId: estudio.id });
  }
  await assert.rejects(iniciarInstagram(ambito, "sesion"), { status: 403 });
});

test("el enlace del integrante apunta al estudio y el independiente necesita plan propio", async (t) => {
  let fila: { id: string; estudio: { slug: string } | null } | null = null;
  reemplazar(t, prisma.usuario, "findFirst", ({ where }: { where: { OR: object[] } }) => {
    assert.deepEqual(Object.keys(where.OR[0]!), ["estudioId", "suscripciones"]);
    assert.ok("estadoEnEstudio" in where.OR[1]!);
    return Promise.resolve(fila);
  });
  assert.deepEqual(await obtenerEnlaceFormularioArtista(artista.id), { enlace: null });
  fila = { id: artista.id, estudio: null };
  assert.deepEqual(await obtenerEnlaceFormularioArtista(artista.id), { enlace: "/cotizacion/artista/artista" });
  fila = { id: artista.id, estudio: { slug: "estudio-central" } };
  assert.deepEqual(await obtenerEnlaceFormularioArtista(artista.id), { enlace: "/cotizacion/estudio-central" });
});

test("cancelar la renovación conserva el acceso durante el período abonado", () => {
  const ahora = new Date("2030-01-01T12:00:00Z");
  assert.deepEqual(periodoPlanVigente(ahora), {
    OR: [
      { estado: "ACTIVA", OR: [{ periodoHasta: null }, { periodoHasta: { gt: ahora } }] },
      { estado: "CANCELADA", periodoHasta: { gt: ahora } },
    ],
  });
});

test("la página de historial conserva el orden y usa fecha e ID para el cursor", () => {
  const fecha = new Date("2030-01-01T12:00:00Z");
  const filas = ["d", "c", "b", "a"].map((id) => ({ id, fecha, estado: "RECIBIDO" }));
  const pagina = presentarMensajes(filas, 3);
  assert.deepEqual(pagina.mensajes.map((mensaje) => mensaje.id), ["b", "c", "d"]);
  assert.equal(pagina.anterior, "b");
  assert.deepEqual(anterioresA({ id: "b", fecha }).OR, [
    { fecha: { lt: fecha } },
    { fecha, id: { lt: "b" } },
  ]);
  assert.deepEqual(presentarMensajes(filas.slice(-1), 3), { mensajes: filas.slice(-1), anterior: null });
  assert.throws(() => anterioresA(null), { status: 404 });
});
