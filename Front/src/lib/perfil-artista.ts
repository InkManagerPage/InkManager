import type { PerfilArtista } from '@/types/artista';

export function camposPendientes(perfil: PerfilArtista): string[] {
  const campos: string[] = [];
  if (!perfil.fotoPerfil) campos.push('foto');
  if (!perfil.nombreArtistico?.trim()) campos.push('nombre artístico');
  if (!perfil.biografia?.trim()) campos.push('biografía');
  if (!perfil.ciudadId) campos.push('ciudad');
  if (!perfil.estilosPrincipales.length) campos.push('estilos');
  return campos;
}
