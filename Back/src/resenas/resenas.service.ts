import { obtenerArtistasConResena } from './resenas.repository.js';
import type { Resena } from './resenas.entity.js';

export async function obtenerResenas(): Promise<Resena[]> {
  const artistas = await obtenerArtistasConResena();

  return artistas.map((artista) => ({
    id: artista.id,
    nombre: artista.nombre,
    fotoUrl: artista.fotoPerfil,
    resena: artista.resena,
  }));
}
