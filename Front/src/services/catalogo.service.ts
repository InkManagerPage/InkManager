import { apiFetch } from '@/lib/api-client';
import type { CatalogoPublico } from '@/types/artista';

export async function obtenerCatalogo(): Promise<CatalogoPublico> {
  return (await apiFetch('/catalogo', { cache: 'no-store' })).json();
}
