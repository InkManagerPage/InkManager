export interface PerfilArtista {
  id: string;
  nombreArtistico: string | null;
  biografia: string | null;
  ciudad: string | null;
  ciudadId: number | null;
  pais: string | null;
  provinciaId: number | null;
  estilosPrincipales: string[];
  fotoPerfil: string | null;
  perfilCompleto: boolean;
  visibleEnCatalogo: boolean;
  totalPublicados: number;
}

export interface TrabajoArtista {
  id: string;
  url: string;
  descripcion: string;
  estilos: string[];
  estado: 'BORRADOR' | 'PUBLICADO';
  createdAt: string;
  updatedAt: string;
}

export interface ArtistaPublico {
  id: string;
  nombreArtistico: string;
  biografia: string;
  ciudad: string;
  estilosPrincipales: string[];
  fotoPerfil: string;
  estudioId: string | null;
  estadoVerificacion: string;
  createdAt: string;
}

export interface TrabajoPublico {
  id: string;
  url: string;
  descripcion: string;
  estilos: string[];
  artistaId: string;
  nombreArtista: string;
  ciudad: string;
  estudioId: string | null;
  createdAt: string;
}

export interface CatalogoPublico {
  artistas: ArtistaPublico[];
  trabajos: TrabajoPublico[];
  estilos: string[];
  ciudades: string[];
}
