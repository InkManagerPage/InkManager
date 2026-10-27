import type { FotoGaleria, Usuario } from "@prisma/client";

export type ArtistaPublico = Pick<
  Usuario,
  | "id"
  | "nombreArtistico"
  | "biografia"
  | "ciudad"
  | "estilosPrincipales"
  | "fotoPerfil"
  | "estudioId"
  | "estadoVerificacion"
  | "createdAt"
>;

export type TrabajoPublico = Pick<
  FotoGaleria,
  "id" | "url" | "descripcion" | "estilos" | "createdAt"
> & {
  artistaId: string;
  nombreArtista: string | null;
  ciudad: string | null;
  estudioId: string | null;
};

export interface CatalogoPublico {
  artistas: ArtistaPublico[];
  trabajos: TrabajoPublico[];
  estilos: readonly string[];
  ciudades: string[];
}
