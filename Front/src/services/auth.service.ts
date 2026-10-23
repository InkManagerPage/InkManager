import { apiFetch, ApiError } from '@/lib/api-client';
import type { RespuestaLogin, UsuarioSesion } from '@/types/auth';
export async function iniciarSesion(email: string, password: string): Promise<RespuestaLogin> {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}
export async function obtenerSesion(signal?: AbortSignal): Promise<UsuarioSesion | null> {
  try {
    const response = await apiFetch('/auth/me', { signal, cache: 'no-store' });
    const data: { user: UsuarioSesion } = await response.json();
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
export async function cerrarSesion(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}
