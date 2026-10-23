import { apiFetch } from '@/lib/api-client';
import type { RegisterValues } from '@/types/forms';
export async function registrarUsuario(values: RegisterValues): Promise<void> {
  const { nombre, email, password, rol, nombreArtistico, nombreEstudio } = values;
  await apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre,
      email,
      password,
      rol,
      ...(rol === 'ARTISTA' ? { nombreArtistico } : {}),
      ...(rol === 'ESTUDIO_ADMIN' ? { nombreEstudio } : {}),
    }),
  });
}
