import type { Request, Response } from 'express';
import { obtenerResenas } from './resenas.service.js';

export async function listarResenas(_req: Request, res: Response): Promise<void> {
  try {
    const resenas = await obtenerResenas();
    res.json(resenas);
  } catch {
    console.error('No se pudieron consultar las reseñas en la base de datos.');
    res.status(503).json({ error: 'No pudimos cargar las reseñas en este momento.' });
  }
}
