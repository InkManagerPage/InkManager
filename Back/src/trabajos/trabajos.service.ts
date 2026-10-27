import { HttpError } from "../errors/http-error.js";
import { subirImagen } from "../imagenes/imagenes.service.js";
import { eliminarImagenSegura } from "../imagenes/imagenes.repository.js";
import * as trabajos from "./trabajos.repository.js";
import { validarIdTrabajo, validarTrabajo } from "./trabajos.validation.js";

export const obtenerMisTrabajos = trabajos.listarTrabajos;

export async function guardarMiTrabajo(
  usuarioId: string,
  entrada: unknown,
  archivo?: Express.Multer.File,
  identificador?: unknown,
) {
  const id =
    identificador === undefined ? undefined : validarIdTrabajo(identificador);
  const anterior = id ? await trabajos.buscarTrabajo(id, usuarioId) : null;
  if (id && !anterior)
    throw new HttpError(404, "No encontramos ese trabajo en tu portafolio.");
  const datos = validarTrabajo(
    entrada,
    Boolean(archivo),
    anterior ?? undefined,
  );
  const imagen = archivo ? await subirImagen(archivo) : undefined;
  const foto = imagen ? { url: imagen.url, publicId: imagen.public_id } : {};
  let trabajo;
  try {
    trabajo = id
      ? await trabajos.guardarTrabajo(id, usuarioId, { ...datos, ...foto })
      : await trabajos.crearTrabajo(usuarioId, { ...datos, url: "", ...foto });
    if (!trabajo)
      throw new HttpError(404, "No encontramos ese trabajo en tu portafolio.");
  } catch (error) {
    if (imagen) await eliminarImagenSegura(imagen.public_id);
    throw error;
  }
  if (imagen && anterior?.publicId && anterior.publicId !== imagen.public_id)
    await eliminarImagenSegura(anterior.publicId);
  return trabajo;
}

export async function eliminarMiTrabajo(
  usuarioId: string,
  identificador: unknown,
): Promise<void> {
  const id = validarIdTrabajo(identificador);
  const anterior = await trabajos.buscarTrabajo(id, usuarioId);
  if (!anterior)
    throw new HttpError(404, "No encontramos ese trabajo en tu portafolio.");
  const resultado = await trabajos.eliminarTrabajo(id, usuarioId);
  if (!resultado.count)
    throw new HttpError(404, "No encontramos ese trabajo en tu portafolio.");
  if (anterior.publicId) await eliminarImagenSegura(anterior.publicId);
}
