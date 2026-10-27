import { apiFetch } from '@/lib/api-client';
import type { Pais, OpcionUbicacion } from '@/types/ubicaciones';

export async function obtenerPaises(signal?: AbortSignal): Promise<Pais[]> {
  return (await apiFetch('/ubicaciones/paises', { signal })).json();
}
export async function obtenerProvincias(
  pais: string,
  signal?: AbortSignal,
): Promise<OpcionUbicacion[]> {
  return (
    await apiFetch(`/ubicaciones/provincias?pais=${encodeURIComponent(pais)}`, { signal })
  ).json();
}
export async function obtenerCiudades(
  pais: string,
  provincia: string,
  signal?: AbortSignal,
): Promise<OpcionUbicacion[]> {
  return (
    await apiFetch(
      `/ubicaciones/ciudades?pais=${encodeURIComponent(pais)}&provincia=${encodeURIComponent(provincia)}`,
      { signal },
    )
  ).json();
}
