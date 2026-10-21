import { HttpError } from '../errors/http-error.js';
import { guardarImagen } from './imagenes.repository.js';
import type { Imagen } from './imagenes.entity.js';

interface ArchivoImagen {
  buffer: Buffer;
  mimetype: string;
}

export async function subirImagen(archivo?: ArchivoImagen): Promise<Imagen> {
  if (!archivo) {
    throw new HttpError(400, 'No se envió ninguna imagen');
  }

  const base64 = archivo.buffer.toString('base64');
  const dataUri = `data:${archivo.mimetype};base64,${base64}`;
  const imagen = await guardarImagen(dataUri);

  return { url: imagen.secure_url, public_id: imagen.public_id };
}
