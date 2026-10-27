import { Rol } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export function obtenerArtistasConResena() {
  return prisma.usuario.findMany({
    where: {
      rol: Rol.ARTISTA,
      nombre: { not: null },
      fotoPerfil: { not: null },
      resena: { not: null },
    },
    select: { id: true, nombre: true, fotoPerfil: true, resena: true },
    orderBy: { nombre: 'asc' },
    take: 20,
  });
}
