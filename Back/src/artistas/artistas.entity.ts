import type { Usuario } from "@prisma/client";

export type PerfilArtista = Pick<
  Usuario,
  | "id"
  | "nombreArtistico"
  | "biografia"
  | "ciudad"
  | "ciudadId"
  | "pais"
  | "estilosPrincipales"
  | "fotoPerfil"
  | "fotoPublicId"
>;

export function perfilCompleto(perfil: PerfilArtista): boolean {
  return Boolean(
    perfil.fotoPerfil &&
    perfil.nombreArtistico?.trim() &&
    perfil.biografia?.trim() &&
    perfil.ciudadId &&
    perfil.estilosPrincipales.length,
  );
}
