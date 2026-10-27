import { prisma } from "../config/prisma.js";
import type { Prisma } from "@prisma/client";

export function listarTrabajos(usuarioId: string) {
  return prisma.fotoGaleria.findMany({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
  });
}
export function buscarTrabajo(id: string, usuarioId: string) {
  return prisma.fotoGaleria.findFirst({ where: { id, usuarioId } });
}
export function crearTrabajo(
  usuarioId: string,
  datos: Omit<Prisma.FotoGaleriaUncheckedCreateInput, "usuarioId">,
) {
  return prisma.fotoGaleria.create({ data: { ...datos, usuarioId } });
}
export async function guardarTrabajo(
  id: string,
  usuarioId: string,
  data: Prisma.FotoGaleriaUpdateManyMutationInput,
) {
  const resultado = await prisma.fotoGaleria.updateMany({
    where: { id, usuarioId },
    data,
  });
  return resultado.count ? buscarTrabajo(id, usuarioId) : null;
}
export function eliminarTrabajo(id: string, usuarioId: string) {
  return prisma.fotoGaleria.deleteMany({ where: { id, usuarioId } });
}
