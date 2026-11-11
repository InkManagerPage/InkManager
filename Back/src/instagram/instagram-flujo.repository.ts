import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { bloquearConversacionCanal } from "../mensajes/mensajes.repository.js";

export async function buscarEnlaceInstagram(token: unknown, estudioId: string) {
  if (token === undefined) return null;
  const flujo = typeof token === "string" && token.length === 36
    ? await prisma.flujoInstagram.findFirst({
        where: { token, conversacion: { canal: "INSTAGRAM", estudioId } },
        select: { conversacionId: true, solicitudId: true, enlaceHasta: true, token: true },
      })
    : null;
  if (!flujo || (!flujo.solicitudId && flujo.enlaceHasta <= new Date()))
    throw new HttpError(410, "El enlace venció. Pedí un formulario nuevo en el chat de Instagram.");
  return flujo;
}

export async function bloquearEnlaceInstagram(
  tx: Prisma.TransactionClient, conversacionId: string, token: string, estudioId: string,
) {
  await bloquearConversacionCanal(tx, conversacionId);
  const flujo = await tx.flujoInstagram.findFirst({
    where: { conversacionId, token, solicitudId: null, enlaceHasta: { gt: new Date() },
      conversacion: { canal: "INSTAGRAM", estudioId, solicitudId: null } },
    select: { conversacionId: true },
  });
  if (!flujo) throw new HttpError(409, "Este enlace ya no está disponible. Volvé al chat de Instagram.");
}

export async function vincularSolicitudInstagram(
  tx: Prisma.TransactionClient, conversacionId: string, solicitudId: string,
) {
  await tx.flujoInstagram.update({ where: { conversacionId }, data: { solicitudId } });
  await tx.conversacionCanal.update({ where: { id: conversacionId }, data: { solicitudId } });
}
