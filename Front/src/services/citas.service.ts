import { apiFetch } from '@/lib/api-client';
import type { CitaGuardada, FormularioCita } from '@/types/citas';
export async function guardarTurno(datos: FormularioCita, id?: string): Promise<CitaGuardada> {
  return (
    await apiFetch(id ? `citas/${id}` : 'citas', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(30000),
    })
  ).json();
}
export async function guardarZonaHoraria(zonaHoraria: string) {
  await apiFetch('citas/zona-horaria', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zonaHoraria }),
  });
}
