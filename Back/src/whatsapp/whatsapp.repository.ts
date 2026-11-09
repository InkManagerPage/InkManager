import { Prisma, type EstadoMensajeWhatsApp } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";

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

const detalleMensaje = {
  id: true,
  texto: true,
  propio: true,
  fecha: true,
  estado: true,
} satisfies Prisma.MensajeWhatsAppSelect;

export async function listarConversaciones(
  a: AmbitoConsultas,
  cantidadMensajes = 60,
) {
  const filas = await prisma.conversacionWhatsApp.findMany({
    where: filtroConversaciones(a),
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
        select: detalleMensaje,
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        take: cantidadMensajes,
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
    mensajes: c.mensajes.reverse().map((m) => ({
      ...m,
      estado:
        m.estado === "ENVIANDO" && Date.now() - m.fecha.getTime() > 90000
          ? ("INCIERTO" as const)
          : m.estado,
    })),
  }));
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
  await prisma.mensajeWhatsApp.updateMany({
    where: {
      propio: true,
      estado: { in: anteriores },
      conversacion: { numeroId },
      OR: [{ proveedorId }, ...(id ? [{ id, proveedorId: null }] : [])],
    },
    data: { proveedorId, estado },
  });
}
