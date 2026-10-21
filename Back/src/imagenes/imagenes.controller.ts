import type { Request, Response } from 'express';
import { HttpError } from '../errors/http-error.js';
import { subirImagen } from './imagenes.service.js';

export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    const imagen = await subirImagen(req.file);
    res.status(200).json({
      message: 'Imagen subida exitosamente a Cloudinary',
      ...imagen,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Error al subir imagen.');
    res.status(500).json({ error: 'Error interno al procesar la imagen' });
  }
}
