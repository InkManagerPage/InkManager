import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export async function registrarAviso(
  tx: Prisma.TransactionClient,
  datos: {
    usuarioId: string;
    clave: string;
    titulo: string;
    detalle: string;
    destino: string;
  },
) {
  await tx.avisoPanel.createMany({ data: [datos], skipDuplicates: true });
}

export async function listarAvisos(usuarioId: string) {
  const filas = await prisma.avisoPanel.findMany({
    where: { usuarioId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
  return filas.map(({ id, titulo, detalle, destino, createdAt, leidaAt }) => ({
    id,
    titulo,
    detalle,
    destino,
    fecha: createdAt.toISOString(),
    leida: Boolean(leidaAt),
  }));
}

export async function leerAvisos(usuarioId: string, id?: string) {
  await prisma.avisoPanel.updateMany({
    where: { usuarioId, leidaAt: null, ...(id ? { id } : {}) },
    data: { leidaAt: new Date() },
  });
}
