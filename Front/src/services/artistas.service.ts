import { apiFetch } from '@/lib/api-client';
import type { PerfilArtista, TrabajoArtista } from '@/types/artista';

export async function obtenerMiPerfil(signal?: AbortSignal): Promise<PerfilArtista> {
  return (await apiFetch('/artistas/perfil', { signal, cache: 'no-store' })).json();
}
export async function guardarMiPerfil(datos: FormData): Promise<PerfilArtista> {
  return (await apiFetch('/artistas/perfil', { method: 'PUT', body: datos })).json();
}
export async function obtenerMisTrabajos(signal?: AbortSignal): Promise<TrabajoArtista[]> {
  return (await apiFetch('/trabajos', { signal, cache: 'no-store' })).json();
}
export async function guardarTrabajo(datos: FormData, id?: string): Promise<TrabajoArtista> {
  return (
    await apiFetch(id ? `/trabajos/${id}` : '/trabajos', {
      method: id ? 'PATCH' : 'POST',
      body: datos,
    })
  ).json();
}
export async function cambiarEstadoTrabajo(trabajo: TrabajoArtista): Promise<TrabajoArtista> {
  return (
    await apiFetch(`/trabajos/${trabajo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: trabajo.estado === 'PUBLICADO' ? 'BORRADOR' : 'PUBLICADO' }),
    })
  ).json();
}
export async function eliminarTrabajo(id: string): Promise<void> {
  await apiFetch(`/trabajos/${id}`, { method: 'DELETE' });
}
export async function obtenerEstilos(signal?: AbortSignal): Promise<string[]> {
  return (await apiFetch('/estilos', { signal })).json();
}
