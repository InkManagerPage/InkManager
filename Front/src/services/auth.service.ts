import { apiFetch } from '@/lib/api-client';
import type { RespuestaLogin } from '@/types/auth';

export async function iniciarSesion(email: string, password: string): Promise<RespuestaLogin> {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}
