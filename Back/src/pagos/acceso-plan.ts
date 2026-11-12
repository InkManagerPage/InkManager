import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export function periodoPlanVigente(ahora = new Date()): Prisma.SuscripcionWhereInput {
  return {
    OR: [
      { estado: "ACTIVA", OR: [{ periodoHasta: null }, { periodoHasta: { gt: ahora } }] },
      { estado: { in: ["CANCELADA", "PAUSADA"] }, periodoHasta: { gt: ahora } },
    ],
  };
}

export function planIndividualVigente(): Prisma.SuscripcionWhereInput {
  return { plan: "INDIVIDUAL", ...periodoPlanVigente() };
}

export function esPreferenciaMercadoPago(id: string | null | undefined) {
  return !!id && /^\d+-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
}

export function tieneRenovacion(s: { bonificada?: boolean; ciclo: string; mercadoPagoId: string | null }) {
  return !s.bonificada && s.ciclo === "MENSUAL" && !esPreferenciaMercadoPago(s.mercadoPagoId);
}

export async function vencerPlanesSinRenovacion(
  tx: Prisma.TransactionClient,
  usuarioId: string,
  ahora: Date,
) {
  const vencida = await tx.suscripcion.findFirst({
    where: { usuarioId, estado: "ACTIVA", periodoHasta: { lte: ahora } },
    select: { id: true, ciclo: true, mercadoPagoId: true, bonificada: true },
  });
  if (vencida && !tieneRenovacion(vencida)) {
    await tx.suscripcion.updateMany({
      where: { id: vencida.id, estado: "ACTIVA", periodoHasta: { lte: ahora } },
      data: { estado: "VENCIDA", proximoCobroAt: null },
    });
  }
}

export async function tienePlanIndividual(usuarioId: string) {
  const plan = await prisma.suscripcion.findFirst({
    where: {
      usuarioId,
      ...planIndividualVigente(),
      usuario: { rol: "ARTISTA", estudioId: null, suspendidoAt: null },
    },
    select: { id: true },
  });
  return Boolean(plan);
}
