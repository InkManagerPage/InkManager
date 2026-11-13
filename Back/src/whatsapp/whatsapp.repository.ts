import { Prisma, type EstadoMensajeWhatsApp } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { anterioresA, camposMensaje, ordenMensajes, presentarMensajes, tamanoPaginaMensajes } from "../mensajes/historial-mensajes.js";

export function filtroConversaciones(
  a: AmbitoConsultas,
): Prisma.ConversacionWhatsAppWhereInput {
  if (a.tipo === "INDEPENDIENTE")
    return { artistaId: a.usuarioId, estudioId: null };
  return {
    estudioId: a.estudioId,
    ...(!a.administra ? { solicitud: { artistaAsignadoId: a.usuarioId } } : {}),
  };
}

export async function listarConversaciones(
  a: AmbitoConsultas,
  cantidadMensajes = tamanoPaginaMensajes,
  solicitudId?: string,
) {
  const filas = await prisma.conversacionWhatsApp.findMany({
    where: { ...filtroConversaciones(a), solicitudId },
    orderBy: [{ ultimaActividad: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      numeroId: true,
      solicitudId: true,
      ultimaEntradaAt: true,
      nombre: true,
      remitente: true,
      mensajes: {
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
    numeroId: c.numeroId,
    clienteId: c.id,
    asunto: "WhatsApp",
    canal: "WHATSAPP" as const,
    nombre: c.nombre,
    telefono: "+" + c.remitente,
    solicitudId: c.solicitudId,
    ventanaHasta: new Date(
      c.ultimaEntradaAt.getTime() + 86400000,
    ).toISOString(),
    sinLeer: c._count.mensajes,
    ...presentarMensajes(c.mensajes, cantidadMensajes),
  }));
}

export async function historialWhatsApp(a: AmbitoConsultas, conversacionId: string, antes: string) {
  const ambito = { conversacionId, conversacion: filtroConversaciones(a) };
  const cursor = await prisma.mensajeWhatsApp.findFirst({
    where: { ...ambito, id: antes },
    select: { id: true, fecha: true },
  });
  const filas = await prisma.mensajeWhatsApp.findMany({
    where: { ...ambito, ...anterioresA(cursor) },
    select: camposMensaje,
    orderBy: ordenMensajes,
    take: tamanoPaginaMensajes + 1,
  });
  return presentarMensajes(filas, tamanoPaginaMensajes);
}

export async function bloquearConversacionWhatsApp(
  tx: Prisma.TransactionClient,
  id: string,
) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "ConversacionWhatsApp"
    WHERE "id" = ${id}
    FOR NO KEY UPDATE
  `;
}

export async function registrarEntrada(datos: {
  numeroId: string;
  remitente: string;
  nombre: string;
  texto: string;
  proveedorId: string;
  fecha: Date;
  estudioId: string | null;
  artistaId: string | null;
  destinatario: string;
  propio?: boolean;
}) {
  await prisma.$transaction(
    async (tx) => {
      await tx.conversacionWhatsApp.createMany({
        data: [
          {
            numeroId: datos.numeroId,
            remitente: datos.remitente,
            nombre: datos.nombre,
            estudioId: datos.estudioId,
            artistaId: datos.artistaId,
            ultimaEntradaAt: datos.propio ? new Date(0) : datos.fecha,
            ultimaActividad: datos.fecha,
          },
        ],
        skipDuplicates: true,
      });
      const hilo = await tx.conversacionWhatsApp.findUniqueOrThrow({
        where: {
          numeroId_remitente: {
            numeroId: datos.numeroId,
            remitente: datos.remitente,
          },
        },
        select: { id: true, estudioId: true, artistaId: true },
      });

      if (datos.propio) {
        await bloquearConversacionWhatsApp(tx, hilo.id);
      }

      if (
        hilo.estudioId !== datos.estudioId ||
        hilo.artistaId !== datos.artistaId
      )
        return;
      const { count } = await tx.mensajeWhatsApp.createMany({
        data: [
          {
            conversacionId: hilo.id,
            proveedorId: datos.proveedorId,
            texto: datos.texto,
            propio: Boolean(datos.propio),
            estado: datos.propio ? "ENVIADO" : "RECIBIDO",
            fecha: datos.fecha,
          },
        ],
        skipDuplicates: true,
      });

      if (!count) return;

      if (!datos.propio)
        await tx.conversacionWhatsApp.updateMany({
          where: { id: hilo.id, ultimaEntradaAt: { lte: datos.fecha } },
          data: { ultimaEntradaAt: datos.fecha, nombre: datos.nombre },
        });
      await tx.conversacionWhatsApp.updateMany({
        where: { id: hilo.id, ultimaActividad: { lt: datos.fecha } },
        data: { ultimaActividad: datos.fecha },
      });

      if (!datos.propio)
        await registrarAviso(tx, {
          usuarioId: datos.destinatario,
          clave: "wpp:" + datos.proveedorId,
          titulo: "Nuevo mensaje de WhatsApp",
          detalle: datos.nombre,
          destino:
            (datos.estudioId ? "/estudio" : "/artista") +
            "/mensajes?conversacion=" +
            hilo.id,
        });
    },
    { timeout: 20000 },
  );
}

export async function registrarEstado(
  numeroId: string,
  proveedorId: string,
  id: string | undefined,
  estado: EstadoMensajeWhatsApp,
  anteriores: EstadoMensajeWhatsApp[],
) {
  await prisma.$transaction(
    async (tx) => {
      const local = id
        ? await tx.mensajeWhatsApp.findFirst({
            where: {
              id,
              propio: true,
              conversacion: { numeroId },
              OR: [{ proveedorId: null }, { proveedorId }],
            },
            select: {
              id: true,
              conversacionId: true,
            },
          })
        : null;

      const mensaje = local ?? await tx.mensajeWhatsApp.findFirst({
        where: {
          proveedorId,
          propio: true,
          conversacion: { numeroId },
        },
        select: {
          id: true,
          conversacionId: true,
        },
      });

      if (!mensaje) return;

      await bloquearConversacionWhatsApp(tx, mensaje.conversacionId);

      if (local) {
        await tx.mensajeWhatsApp.deleteMany({
          where: {
            conversacionId: local.conversacionId,
            proveedorId,
            propio: true,
            claveEnvio: null,
            id: { not: local.id },
          },
        });

        await tx.mensajeWhatsApp.updateMany({
          where: {
            id: local.id,
            propio: true,
            estado: { in: anteriores },
            OR: [{ proveedorId: null }, { proveedorId }],
          },
          data: { proveedorId, estado },
        });

        return;
      }

      await tx.mensajeWhatsApp.updateMany({
        where: {
          id: mensaje.id,
          propio: true,
          estado: { in: anteriores },
          conversacion: { numeroId },
        },
        data: { proveedorId, estado },
      });
    },
    { timeout: 20000 },
  );
}
