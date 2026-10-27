import { prisma } from "../config/prisma.js";
import type { Prisma } from "@prisma/client";

export const camposPerfil = {
  id: true,
  nombreArtistico: true,
  biografia: true,
  ciudad: true,
  ciudadId: true,
  pais: true,
  estilosPrincipales: true,
  fotoPerfil: true,
  fotoPublicId: true,
} as const;

export function buscarPerfilArtista(id: string) {
  return prisma.usuario.findUnique({ where: { id }, select: camposPerfil });
}

export function guardarPerfilArtista(
  id: string,
  data: Prisma.UsuarioUpdateInput,
) {
  return prisma.usuario.update({ where: { id }, data, select: camposPerfil });
}

export function contarTrabajosPublicados(usuarioId: string) {
  return prisma.fotoGaleria.count({
    where: { usuarioId, estado: "PUBLICADO" },
  });
}
