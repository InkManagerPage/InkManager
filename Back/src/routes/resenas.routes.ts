import { Router } from 'express';
import { Rol } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export const resenasRouter = Router();

resenasRouter.get('/', async (_req, res) => {
  try {
    const resenas = await prisma.usuario.findMany({
      where: {
        rol: Rol.ARTISTA,
        nombre: { not: null },
        fotoPerfil: { not: null },
        resena: { not: null },
      },
      // El endpoint público solo devuelve lo que necesita la tarjeta.
      select: { id: true, nombre: true, fotoPerfil: true, resena: true },
      orderBy: { nombre: 'asc' },
      take: 20,
    });

    res.json(
      resenas.map((artista) => ({
        id: artista.id,
        nombre: artista.nombre,
        fotoUrl: artista.fotoPerfil,
        resena: artista.resena,
      })),
    );
  } catch {
    console.error('No se pudieron consultar las reseñas en la base de datos.');
    res.status(503).json({ error: 'No pudimos cargar las reseñas en este momento.' });
  }
});
