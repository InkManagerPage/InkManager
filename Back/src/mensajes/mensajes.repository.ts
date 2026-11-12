import type { CanalMensajes, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { anterioresA, camposMensaje, ordenMensajes, presentarMensajes, tamanoPaginaMensajes } from "./historial-mensajes.js";

export const ventanaRespuesta = 24 * 60 * 60 * 1000;

export function filtroCanal(
  a: AmbitoConsultas,
): Prisma.ConversacionCanalWhereInput {
  if (!a.estudioId) return { estudioId: null, artistaId: a.usuarioId };
  return {
    estudioId: a.estudioId,
    ...(!a.administra ? { solicitud: { artistaAsignadoId: a.usuarioId } } : {}),
  };
}

export async function listarCanales(
  a: AmbitoConsultas,
  cantidadMensajes: number,
  solicitudId?: string,
) {
  const filas = await prisma.conversacionCanal.findMany({
    where: { ...filtroCanal(a), solicitudId },
    orderBy: [{ ultimaActividad: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      canal: true,
      cuentaId: true,
      nombre: true,
      solicitudId: true,
      ultimaEntradaAt: true,
      flujoInstagram: { select: { pausadoAt: true } },
      mensajes: {
        where: { ecoInstagram: false },
        select: camposMensaje,
        orderBy: ordenMensajes,
        take: cantidadMensajes + 1,
      },
      _count: {
        select: { mensajes: { where: { propio: false, leidoAt: null } } },
      },
    },
  });
  return filas.map((c) => ({
    id: c.id,
    clienteId: c.id,
    canal: c.canal,
    cuentaId: c.cuentaId,
    nombre: c.nombre,
    asunto: "Mensaje directo",
    solicitudId: c.solicitudId,
    ...(a.administra && a.estudioId && c.canal === "INSTAGRAM" && {
      botActivo: !c.flujoInstagram?.pausadoAt,
    }),
    ventanaHasta: new Date(
      c.ultimaEntradaAt.getTime() + ventanaRespuesta,
    ).toISOString(),
    sinLeer: c._count.mensajes,
    ...presentarMensajes(c.mensajes, cantidadMensajes),
  }));
}

export async function historialInstagram(a: AmbitoConsultas, conversacionId: string, antes: string) {
  const ambito = { conversacionId, conversacion: { canal: "INSTAGRAM" as const, ...filtroCanal(a) } };
  const cursor = await prisma.mensajeCanal.findFirst({
    where: { ...ambito, id: antes },
    select: { id: true, fecha: true },
  });
  const filas = await prisma.mensajeCanal.findMany({
    where: { ...ambito, ecoInstagram: false, ...anterioresA(cursor) },
    select: camposMensaje,
    orderBy: ordenMensajes,
    take: tamanoPaginaMensajes + 1,
  });
  return presentarMensajes(filas, tamanoPaginaMensajes);
}

export async function bloquearConversacionCanal(
  tx: Prisma.TransactionClient,
  id: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "ConversacionCanal" WHERE "id" = ${id} FOR NO KEY UPDATE`;
}

export async function guardarMensajeCanal(d: {
  canal: CanalMensajes;
  cuentaId: string;
  estudioId: string | null;
  artistaId: string | null;
  remitente: string;
  nombre: string;
  proveedorId: string;
  texto: string;
  fecha: Date;
} & ({ propio: true } | { propio: false; destinatario: string; bot?: { accion?: string } })) {
  return prisma.$transaction(
    async (tx) => {
      const ambito = { estudioId: d.estudioId, artistaId: d.artistaId };
      const clave = {
        canal: d.canal,
        cuentaId: d.cuentaId,
        remitente: d.remitente,
      };
      await tx.conversacionCanal.createMany({
        data: [
          {
            ...clave,
            ...ambito,
            nombre: d.nombre,
            ultimaActividad: d.fecha,
            ultimaEntradaAt: d.propio ? new Date(0) : d.fecha,
          },
        ],
        skipDuplicates: true,
      });
      const hilo = await tx.conversacionCanal.findUniqueOrThrow({
        where: { canal_cuentaId_remitente: clave },
      });
      if (hilo.estudioId !== d.estudioId || hilo.artistaId !== d.artistaId)
        return;
      const entrante = d.propio ? undefined : d.bot;
      if (d.propio || entrante) await bloquearConversacionCanal(tx, hilo.id);
      const flujo = entrante && await tx.flujoInstagram.findUnique({
        where: { conversacionId: hilo.id },
        select: { pausadoAt: true },
      });
      const bot = flujo && flujo.pausadoAt ? undefined : entrante;
      const { count } = await tx.mensajeCanal.createMany({
        data: [
          {
            conversacionId: hilo.id,
            proveedorId: d.proveedorId,
            texto: d.texto,
            propio: d.propio,
            estado: d.propio ? "ENVIADO" : "RECIBIDO",
            fecha: d.fecha,
            ...(bot && { botPendiente: true, accionBot: bot.accion }),
          },
        ],
        skipDuplicates: true,
      });
      if (!count) return;
      await tx.conversacionCanal.updateMany({
        where: { id: hilo.id, ultimaActividad: { lt: d.fecha } },
        data: { ultimaActividad: d.fecha },
      });
      if (d.propio) return;
      if (bot)
        await tx.conversacionCanal.update({
          where: { id: hilo.id },
          data: { botResponderAt: new Date(Date.now() + 10_000) },
        });
      await tx.conversacionCanal.updateMany({
        where: { id: hilo.id, ultimaEntradaAt: { lt: d.fecha } },
        data: { ultimaEntradaAt: d.fecha },
      });
      await registrarAviso(tx, {
        usuarioId: d.destinatario,
        clave: d.canal + ":" + d.cuentaId + ":" + d.proveedorId,
        titulo:
          d.canal === "INSTAGRAM"
            ? "Nuevo mensaje de Instagram"
            : "Nuevo mensaje",
        detalle: d.nombre,
        destino:
          (d.estudioId ? "/estudio" : "/artista") +
          "/mensajes?conversacion=" +
          hilo.id,
      });
      return hilo;
    },
    { timeout: 20000 },
  );
}
