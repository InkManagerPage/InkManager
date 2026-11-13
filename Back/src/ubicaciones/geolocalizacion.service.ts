import { prisma } from "../config/prisma.js";
import * as ubicacionesRepo from "./ubicaciones.repository.js";

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface ArtistaCercano {
  id: string;
  nombre: string;
  nombreArtistico: string | null;
  alias: string | null;
  ciudad: string | null;
  pais: string | null;
  direccion: string | null;
  radioAlcanceKm: number;
  distanciaKm: number;
  estilosPrincipales: string[];
  esEspecialista: boolean;
  estudio: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
}

export interface ResultadoEmparejamientoGeo {
  origen: Coordenadas;
  estiloSolicitado: string;
  radioBusquedaKm: number;
  artistasIdeales: ArtistaCercano[];
  otrosArtistasCercanos: ArtistaCercano[];
  totalCercanos: number;
}

/**
 * Obtiene las coordenadas geográficas (lat/lng) de una ciudad a partir de su ID.
 */
export function obtenerCoordenadasPorCiudadId(ciudadId: number | null | undefined): Coordenadas | null {
  if (!ciudadId) return null;
  const ciudad = ubicacionesRepo.buscarCiudad(ciudadId);
  if (!ciudad || !ciudad.latitude || !ciudad.longitude) return null;

  const lat = Number(ciudad.latitude);
  const lng = Number(ciudad.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { latitud: lat, longitud: lng };
}

/**
 * Fórmula de Haversine para calcular la distancia en kilómetros entre dos coordenadas geográficas.
 */
export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // redondeado a 1 decimal
}

/**
 * Busca artistas cercanos a las coordenadas del cliente y los clasifica
 * en "Artistas Ideales" (especializados en el estilo) y "Otros Artistas Cercanos".
 */
export async function buscarArtistasCercanosPorEstilo(opciones: {
  latitud: number;
  longitud: number;
  estilo?: string;
  radioMaximoKm?: number;
}): Promise<ResultadoEmparejamientoGeo> {
  const { latitud, longitud, estilo = "", radioMaximoKm = 80 } = opciones;

  // Consultamos los artistas activos que tengan ciudad configurada
  const artistas = await prisma.usuario.findMany({
    where: {
      rol: "ARTISTA",
      suspendidoAt: null,
      ciudadId: { not: null },
    },
    select: {
      id: true,
      nombre: true,
      nombreArtistico: true,
      alias: true,
      ciudad: true,
      ciudadId: true,
      pais: true,
      direccion: true,
      radioAlcanceKm: true,
      estilosPrincipales: true,
      estudio: {
        select: {
          id: true,
          nombre: true,
          slug: true,
          ciudadId: true,
        },
      },
    },
  });

  const estiloNormalizado = estilo.trim().toLowerCase();
  const artistasIdeales: ArtistaCercano[] = [];
  const otrosArtistasCercanos: ArtistaCercano[] = [];

  for (const artista of artistas) {
    // Calculamos latitud y longitud a partir de la ciudad del artista o del estudio
    const coords =
      obtenerCoordenadasPorCiudadId(artista.ciudadId) ||
      obtenerCoordenadasPorCiudadId(artista.estudio?.ciudadId);

    if (!coords) continue;

    const distancia = calcularDistanciaKm(
      latitud,
      longitud,
      coords.latitud,
      coords.longitud,
    );

    const radioEfectivo = Math.max(radioMaximoKm, artista.radioAlcanceKm || 0);

    // Solo se consideran aquellos dentro del radio de alcance
    if (distancia <= radioEfectivo) {
      const esEspecialista = estiloNormalizado.length > 0 && artista.estilosPrincipales.some(
        (e) => e.toLowerCase() === estiloNormalizado || e.toLowerCase().includes(estiloNormalizado),
      );

      const item: ArtistaCercano = {
        id: artista.id,
        nombre: artista.nombre || "Artista",
        nombreArtistico: artista.nombreArtistico,
        alias: artista.alias,
        ciudad: artista.ciudad,
        pais: artista.pais,
        direccion: artista.direccion,
        radioAlcanceKm: radioEfectivo,
        distanciaKm: distancia,
        estilosPrincipales: artista.estilosPrincipales,
        esEspecialista,
        estudio: artista.estudio ? {
          id: artista.estudio.id,
          nombre: artista.estudio.nombre,
          slug: artista.estudio.slug,
        } : null,
      };

      if (esEspecialista) {
        artistasIdeales.push(item);
      } else {
        otrosArtistasCercanos.push(item);
      }
    }
  }

  // Ordenamos ambos grupos por distancia (el más cercano primero)
  artistasIdeales.sort((a, b) => a.distanciaKm - b.distanciaKm);
  otrosArtistasCercanos.sort((a, b) => a.distanciaKm - b.distanciaKm);

  return {
    origen: { latitud, longitud },
    estiloSolicitado: estilo,
    radioBusquedaKm: radioMaximoKm,
    artistasIdeales,
    otrosArtistasCercanos,
    totalCercanos: artistasIdeales.length + otrosArtistasCercanos.length,
  };
}
