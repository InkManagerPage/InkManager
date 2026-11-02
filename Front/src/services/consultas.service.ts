import { apiFetch } from '@/lib/api-client';
import type { BandejaConsultas, ConsultaGuardada } from '@/types/consultas';
import type { PresupuestoPanel } from '@/types/panel-artista';
export async function obtenerConsultas(signal?: AbortSignal): Promise<BandejaConsultas> {
  return (
    await apiFetch('consultas', {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
      cache: 'no-store',
    })
  ).json();
}
export async function actualizarConsulta(
  id: string,
  datos: Record<string, unknown>,
): Promise<ConsultaGuardada> {
  return (
    await apiFetch(`consultas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(30000),
    })
  ).json();
}
export async function guardarPropuesta(
  id: string,
  datos: PresupuestoPanel,
  version: number,
  imagen: File | null,
): Promise<ConsultaGuardada> {
  const body = new FormData();
  for (const [key, value] of Object.entries({ ...datos, version })) body.set(key, String(value));
  if (imagen) body.set('imagen', imagen);
  return (
    await apiFetch(`consultas/${id}/cotizacion`, {
      method: 'PUT',
      body,
      signal: AbortSignal.timeout(60000),
    })
  ).json();
}
