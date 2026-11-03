import { apiFetch } from '@/lib/api-client';
import type { AccionIntegrante } from '@/types/equipo';
async function escribir(ruta: string, method: string, datos: object): Promise<string> {
  const respuesta = await apiFetch(ruta, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(45000),
  });
  const cuerpo: { message: string } = await respuesta.json();
  return cuerpo.message;
}
export function invitarArtista(email: string) {
  return escribir('invitaciones-equipo', 'POST', { email: email.trim() });
}
export function gestionarInvitacion(id: string, accion: 'REENVIAR' | 'CANCELAR', version: number) {
  return escribir(`invitaciones-equipo/${id}`, 'PATCH', { accion, version });
}
export function responderInvitacion(id: string, accion: 'ACEPTAR' | 'RECHAZAR', version: number) {
  return escribir(`invitaciones-equipo/${id}/respuesta`, 'POST', { accion, version });
}
export function cambiarIntegrante(id: string, accion: AccionIntegrante, version: number) {
  return escribir(`equipo/${id}`, 'PATCH', { accion, version });
}
