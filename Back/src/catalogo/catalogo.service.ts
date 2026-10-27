import { consultarCatalogo } from "./catalogo.repository.js";
import { estilosCatalogo } from "../estilos/estilos.entity.js";
import type { CatalogoPublico } from "./catalogo.entity.js";
import { obtenerUbicacion } from "../ubicaciones/ubicaciones.service.js";

export async function obtenerCatalogo(): Promise<CatalogoPublico> {
  const filas = await consultarCatalogo();
  const publicos = filas.filter(
    (artista) =>
      artista.nombreArtistico?.trim() &&
      artista.biografia?.trim() &&
      artista.ciudad?.trim(),
  );
  return {
    artistas: publicos.map(({ galeria: _trabajos, ...artista }) => ({
      ...artista,
      ciudad: obtenerUbicacion(artista.ciudadId)?.ubicacion || artista.ciudad,
    })),
    trabajos: publicos.flatMap((artista) =>
      artista.galeria.map((trabajo) => ({
        ...trabajo,
        artistaId: artista.id,
        nombreArtista: artista.nombreArtistico,
        ciudad: obtenerUbicacion(artista.ciudadId)?.ubicacion || artista.ciudad,
        estudioId: artista.estudioId,
      })),
    ),
    estilos: estilosCatalogo,
    ciudades: [
      ...new Set(
        publicos.map(
          (artista) =>
            obtenerUbicacion(artista.ciudadId)?.ubicacion || artista.ciudad!,
        ),
      ),
    ].sort(),
  };
}
