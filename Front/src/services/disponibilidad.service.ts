import { apiFetch } from '@/lib/api-client';
import type {
  DisponibilidadAgenda,
  SemanaDisponible,
  FormularioBloqueo,
} from '@/types/disponibilidad';
export async function obtenerDisponibilidad(
  artistaId: string,
  signal?: AbortSignal,
): Promise<DisponibilidadAgenda> {
  return (await apiFetch(`disponibilidad/${artistaId}`, { signal, cache: 'no-store' })).json();
}
async function escribir(
  ruta: string,
  method: string,
  datos: unknown,
): Promise<DisponibilidadAgenda> {
  return (
    await apiFetch(ruta, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(45000),
    })
  ).json();
}
export function guardarHorario(artistaId: string, semana: SemanaDisponible, version: number) {
  return escribir(`disponibilidad/${artistaId}`, 'PUT', { semana, version });
}
export function guardarBloqueo(artistaId: string, datos: FormularioBloqueo, id?: string) {
  return escribir(
    `disponibilidad/${artistaId}/bloqueos${id ? `/${id}` : ''}`,
    id ? 'PATCH' : 'POST',
    datos,
  );
}
export function quitarBloqueo(artistaId: string, id: string, version: number) {
  return escribir(`disponibilidad/${artistaId}/bloqueos/${id}`, 'DELETE', { version });
}
