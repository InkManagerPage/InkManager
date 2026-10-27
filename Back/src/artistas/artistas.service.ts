import { HttpError } from "../errors/http-error.js";
import { subirImagen } from "../imagenes/imagenes.service.js";
import { eliminarImagenSegura } from "../imagenes/imagenes.repository.js";
import {
  buscarPerfilArtista,
  contarTrabajosPublicados,
  guardarPerfilArtista,
} from "./artistas.repository.js";
import { perfilCompleto, type PerfilArtista } from "./artistas.entity.js";
import { validarPerfilArtista } from "./artistas.validation.js";
import { obtenerUbicacion } from "../ubicaciones/ubicaciones.service.js";

async function respuestaPerfil(perfil: PerfilArtista) {
  const totalPublicados = await contarTrabajosPublicados(perfil.id);
  const completo = perfilCompleto(perfil);
  const { fotoPublicId: _privado, ...datos } = perfil;
  return {
    ...datos,
    pais: obtenerUbicacion(perfil.ciudadId)?.pais ?? null,
    provinciaId: obtenerUbicacion(perfil.ciudadId)?.provinciaId ?? null,
    perfilCompleto: completo,
    totalPublicados,
    visibleEnCatalogo: completo && totalPublicados > 0,
  };
}

export async function obtenerPerfilArtista(usuarioId: string) {
  const perfil = await buscarPerfilArtista(usuarioId);
  if (!perfil) throw new HttpError(404, "No encontramos tu perfil.");
  return respuestaPerfil(perfil);
}

export async function actualizarPerfilArtista(
  usuarioId: string,
  entrada: unknown,
  archivo?: Express.Multer.File,
) {
  const datos = validarPerfilArtista(entrada);
  const anterior = await buscarPerfilArtista(usuarioId);
  if (!anterior) throw new HttpError(404, "No encontramos tu perfil.");
  const imagen = archivo ? await subirImagen(archivo) : undefined;
  let perfil;
  try {
    perfil = await guardarPerfilArtista(usuarioId, {
      ...datos,
      ...(imagen
        ? { fotoPerfil: imagen.url, fotoPublicId: imagen.public_id }
        : {}),
    });
  } catch (error) {
    if (imagen) await eliminarImagenSegura(imagen.public_id);
    throw error;
  }
  if (
    imagen &&
    anterior.fotoPublicId &&
    anterior.fotoPublicId !== imagen.public_id
  )
    await eliminarImagenSegura(anterior.fotoPublicId);
  return respuestaPerfil(perfil);
}
