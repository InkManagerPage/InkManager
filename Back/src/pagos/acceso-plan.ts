import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export function periodoPlanVigente(ahora = new Date()): Prisma.SuscripcionWhereInput {
  return {
    OR: [
      { estado: "ACTIVA", OR: [{ periodoHasta: null }, { periodoHasta: { gt: ahora } }] },
      { estado: "CANCELADA", periodoHasta: { gt: ahora } },
    ],
  };
}

export function planIndividualVigente(): Prisma.SuscripcionWhereInput {
  return { plan: "INDIVIDUAL", ...periodoPlanVigente() };
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
