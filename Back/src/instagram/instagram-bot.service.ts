import { randomUUID } from "node:crypto";
import type { ConversacionCanal, EstadoMensajeCanal } from "@prisma/client";
import { origenesPermitidos } from "../config/auth.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { bloquearConversacionCanal, ventanaRespuesta } from "../mensajes/mensajes.repository.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import { detalleSolicitud, type SolicitudCompleta } from "../solicitudes/solicitudes.entity.js";
import { cotizacionesVigentes } from "../solicitudes/solicitudes.service.js";
import { estudioPiloto } from "./instagram-flujo.repository.js";

type Enviar = (hilo: ConversacionCanal, clave: string, texto: string) => Promise<EstadoMensajeCanal>;
const dia = 24 * 60 * 60 * 1000;
const ayuda = "Escribí PRESUPUESTO para ver tu consulta o HUMANO para hablar con el estudio.";

export function interpretarMensajeBot(texto: string) {
  const mensaje = texto.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase()
    .replace(/^[¿¡]+|[!?.]+$/g, "").trim();
  const opcion = /^elegir ([a-f0-9]{8})$/.exec(mensaje);
  if (opcion) return { tipo: "ELEGIR", codigo: opcion[1]! } as const;
  if (/^(humano|asesor|hablar con (el )?estudio|hablar con (una )?persona)$/.test(mensaje))
    return { tipo: "HUMANO" } as const;
  if (/^(turno|pedir turno|agendar|quiero (un )?turno)$/.test(mensaje))
    return { tipo: "TURNO" } as const;
  if (/^(hola|buen dia|buenos dias|buenas(?: tardes| noches)?)(?:$|[\s,!.?])/.test(mensaje) ||
    /^(presupuesto|cotizacion|estado|formulario|bot|quiero (?:pedir )?(?:un )?presupuesto)$/.test(mensaje))
    return { tipo: mensaje === "bot" ? "REANUDAR" : "CONSULTAR" } as const;
  return null;
}

function opcionesDe(solicitud: SolicitudCompleta) {
  return cotizacionesVigentes(solicitud).map(c => ({
    ...c, codigo: c.id.slice(0, 8).toLowerCase(),
    nombre: (c.artista.nombreArtistico || c.artista.nombre || "Artista").slice(0, 45),
  }));
}

function mostrarOpciones(solicitud: SolicitudCompleta) {
  const opciones = opcionesDe(solicitud);
  if (!opciones.length) return "Las propuestas ya no están disponibles. Escribí HUMANO para que te ayude el estudio.";
  const formato = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: solicitud.moneda || "ARS", currencyDisplay: "code",
  });
  const lista = opciones.slice(0, 8).map(c =>
    `${c.nombre} · ${formato.format(Number(c.monto))} · ${c.codigo.toUpperCase()}`).join("\n");
  return "Estas son las propuestas vigentes:\n" + lista +
    "\nPara confirmar una, escribí ELEGIR seguido del código. Para hablar con el estudio, escribí HUMANO." +
    (opciones.length > 8 ? "\nEl estudio puede mostrarte las demás opciones." : "");
}

function estadoSolicitud(solicitud: SolicitudCompleta) {
  if (solicitud.estado === "ELECCION_CLIENTE") return mostrarOpciones(solicitud);
  if (solicitud.estado === "ASIGNADA")
    return "Tu consulta ya tiene artista asignado. Escribí TURNO para pedir que el estudio coordine una fecha.";
  if (solicitud.estado === "POR_ASIGNAR")
    return "El estudio está revisando quién puede tomar tu consulta. " + ayuda;
  return "Ya recibimos tu consulta. El estudio está preparando las propuestas. " + ayuda;
}

async function iniciarFlujo(hilo: ConversacionCanal) {
  return prisma.$transaction(async tx => {
    await bloquearConversacionCanal(tx, hilo.id);
    const actual = await tx.conversacionCanal.findUniqueOrThrow({
      where: { id: hilo.id }, include: { flujoInstagram: true, solicitud: { select: { estado: true } } },
    });
    if (actual.solicitudId && actual.solicitud?.estado !== "ARCHIVADA" &&
      actual.solicitud?.estado !== "CANCELADO") return null;

    const ahora = new Date();
    const previo = actual.flujoInstagram;
    if (previo && !actual.solicitudId && !previo.solicitudId && previo.enlaceHasta > ahora) return previo;
    const nuevo = { token: randomUUID(), enlaceHasta: new Date(ahora.getTime() + dia),
      solicitudId: null, pausadoAt: previo?.pausadoAt ?? null,
      recepcionAt: null, versionAvisada: null, revisadoAt: ahora };
    if (actual.solicitudId)
      await tx.conversacionCanal.update({ where: { id: hilo.id }, data: { solicitudId: null } });
    return tx.flujoInstagram.upsert({
      where: { conversacionId: hilo.id }, create: { conversacionId: hilo.id, ...nuevo }, update: nuevo,
    });
  });
}

async function elegirPropuesta(hilo: ConversacionCanal, codigo: string, titularId: string) {
  return prisma.$transaction(async tx => {
    await bloquearConversacionCanal(tx, hilo.id);
    const flujo = await tx.flujoInstagram.findUnique({
      where: { conversacionId: hilo.id }, include: { conversacion: { select: { solicitudId: true } } },
    });
    const id = flujo?.solicitudId;
    if (!id || flujo.pausadoAt || flujo.conversacion.solicitudId !== id)
      return "Para elegir una propuesta, necesitás una consulta activa en este chat. " + ayuda;
    await tx.$queryRaw`SELECT "id" FROM "Solicitud" WHERE "id" = ${id} FOR UPDATE`;
    const solicitud = await tx.solicitud.findFirst({
      where: { id, estudioId: hilo.estudioId, canal: "INSTAGRAM" }, include: detalleSolicitud,
    });
    if (!solicitud) return "No encontramos la consulta de este chat. " + ayuda;
    if (solicitud.estado !== "ELECCION_CLIENTE") return estadoSolicitud(solicitud);
    const opciones = opcionesDe(solicitud).filter(c => c.codigo === codigo);
    if (opciones.length !== 1) return "Ese código ya no está disponible.\n" + mostrarOpciones(solicitud);
    const opcion = opciones[0]!;
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${opcion.artistaId} FOR SHARE`;
    const artista = await tx.usuario.findFirst({
      where: { id: opcion.artistaId, estudioId: hilo.estudioId, rol: "ARTISTA", estadoEnEstudio: "ACTIVO", suspendidoAt: null },
      select: { id: true },
    });
    if (!artista || (opcion.validaHasta && opcion.validaHasta < new Date()))
      return "Esa propuesta ya no está disponible. Escribí ESTADO para consultar las opciones.";
    const actualizada = await tx.solicitud.update({
      where: { id }, data: { artistaAsignadoId: artista.id, estado: "ASIGNADA",
        asignadaPor: "CLIENTE", version: { increment: 1 } },
      select: { version: true },
    });
    await tx.flujoInstagram.update({ where: { conversacionId: hilo.id }, data: { versionAvisada: actualizada.version } });
    const aviso = { clave: "eleccion:" + id, titulo: "El cliente eligió una propuesta", detalle: solicitud.titulo };
    await registrarAviso(tx, { ...aviso, usuarioId: titularId, destino: "/estudio/consultas?consulta=" + id });
    await registrarAviso(tx, { ...aviso, usuarioId: artista.id, destino: "/artista/consultas?consulta=" + id });
    return `Quedó confirmada tu elección de ${opcion.nombre}. Escribí TURNO para pedir que el estudio coordine una fecha.`;
  });
}

export async function procesarMensajeBot(
  id: string, titularId: string, proveedorId: string, texto: string, enviar: Enviar,
) {
  const comando = interpretarMensajeBot(texto);
  if (!comando) return;
  const clave = `bot:respuesta:${id}:${proveedorId}`;
  if (await prisma.mensajeCanal.findUnique({ where: { claveEnvio: clave }, select: { id: true } })) return;
  const hilo = await prisma.conversacionCanal.findUnique({
    where: { id }, include: { estudio: { select: { slug: true } }, flujoInstagram: true },
  });
  if (!hilo?.estudio || hilo.estudio.slug !== estudioPiloto() ||
    Date.now() - hilo.ultimaEntradaAt.getTime() >= ventanaRespuesta) return;

  let flujo = hilo.flujoInstagram;
  if (comando.tipo === "HUMANO" || comando.tipo === "TURNO") {
    const ahora = new Date();
    const pedirTurno = comando.tipo === "TURNO";
    await prisma.$transaction(async tx => {
      await tx.flujoInstagram.upsert({
        where: { conversacionId: id },
        create: { conversacionId: id, token: randomUUID(), enlaceHasta: ahora, pausadoAt: ahora },
        update: { pausadoAt: ahora },
      });
      await registrarAviso(tx, { usuarioId: titularId, clave,
        titulo: pedirTurno ? "Solicitud de turno por Instagram" : "Un cliente pide hablar con el estudio",
        detalle: hilo.nombre, destino: "/estudio/mensajes?conversacion=" + id });
    });
    await enviar(hilo, clave, pedirTurno
      ? "Le avisé al estudio para que coordine tu turno por acá."
      : "Le avisé al estudio. Una persona va a seguir la conversación por acá.");
    return;
  }
  if (flujo?.pausadoAt) {
    if (comando.tipo !== "REANUDAR") return;
    flujo = await prisma.flujoInstagram.update({
      where: { conversacionId: id }, data: { pausadoAt: null },
    });
  }
  if (comando.tipo === "ELEGIR") {
    await enviar(hilo, clave, await elegirPropuesta(hilo, comando.codigo, titularId));
    return;
  }

  if (flujo?.solicitudId && flujo.solicitudId === hilo.solicitudId) {
    const solicitud = await prisma.solicitud.findFirst({
      where: { id: flujo.solicitudId, estudioId: hilo.estudioId, estado: { notIn: ["ARCHIVADA", "CANCELADO"] } },
      include: detalleSolicitud,
    });
    if (solicitud) {
      await enviar(hilo, clave, estadoSolicitud(solicitud));
      return;
    }
  }
  const nuevo = await iniciarFlujo(hilo);
  if (!nuevo) {
    await enviar(hilo, clave, "Ya hay una consulta vinculada a este chat. Escribí HUMANO para hablar con el estudio.");
    return;
  }
  const url = new URL("/cotizacion/" + encodeURIComponent(hilo.estudio.slug), origenesPermitidos[0]);
  url.searchParams.set("ig", nuevo.token);
  await enviar(hilo, clave, `¡Hola! Completá este formulario para pedir un presupuesto: ${url.href}\nDespués seguimos por acá. Si querés hablar con el estudio, escribí HUMANO.`);
}

export function iniciarBotInstagram(enviar: Enviar) {
  if (!estudioPiloto()) return;
  let ejecutando = false;
  const revisar = async () => {
    if (ejecutando) return;
    ejecutando = true;
    try {
      await notificarConsultas(enviar);
    } catch {
      console.error("No pudimos revisar las respuestas del bot de Instagram.");
    } finally {
      ejecutando = false;
    }
  };
  setInterval(() => void revisar(), 20000).unref();
}

export async function notificarConsultas(enviar: Enviar) {
  const slug = estudioPiloto();
  if (!slug) return;
  const flujos = await prisma.flujoInstagram.findMany({
    where: { pausadoAt: null, solicitudId: { not: null },
      conversacion: { canal: "INSTAGRAM", ultimaEntradaAt: { gt: new Date(Date.now() - ventanaRespuesta) },
        estudio: { slug, propietario: { rol: "ESTUDIO_ADMIN", suspendidoAt: null } } },
      OR: [{ recepcionAt: null }, { solicitud: { estado: { in: ["ELECCION_CLIENTE", "ASIGNADA"] } } }],
    },
    include: { conversacion: true, solicitud: { include: detalleSolicitud } },
    orderBy: { revisadoAt: "asc" }, take: 20,
  });
  for (const f of flujos) {
    const s = f.solicitud;
    if (!s || f.conversacion.solicitudId !== s.id || s.estudioId !== f.conversacion.estudioId) continue;
    const where = { conversacionId: f.conversacionId, solicitudId: s.id, pausadoAt: null };
    const ahora = new Date();
    if (!(await prisma.flujoInstagram.updateMany({ where, data: { revisadoAt: ahora } })).count) continue;
    try {
      if (!f.recepcionAt) {
        await enviar(f.conversacion, `bot:recibida:${s.id}`,
          "Ya recibimos tu idea para el tatuaje. Te vamos a escribir por acá cuando haya novedades. " + ayuda);
        await prisma.flujoInstagram.updateMany({ where, data: { recepcionAt: ahora } });
      }
      if ((s.estado === "ELECCION_CLIENTE" || s.estado === "ASIGNADA") && f.versionAvisada !== s.version) {
        const sigueVigente = await prisma.flujoInstagram.findFirst({
          where: { ...where, solicitud: { version: s.version }, conversacion: { solicitudId: s.id } },
          select: { conversacionId: true },
        });
        if (!sigueVigente) continue;
        await enviar(f.conversacion, `bot:estado:${s.id}:${s.version}`, estadoSolicitud(s));
        await prisma.flujoInstagram.updateMany({ where, data: { versionAvisada: s.version } });
      }
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("No pudimos procesar una respuesta de Instagram.");
    }
  }
}
