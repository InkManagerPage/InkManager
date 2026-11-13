export interface MarcaZona {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  rotacion: number;
}

export interface CotizacionValues {
  nombre: string;
  email: string;
  telefono: string;
  promociones: boolean;
  // Paso 1: Color
  esColor: boolean | null;

  // Paso 2: Estilo
  estilo: string;

  // Paso 3: Modelo corporal
  generoLienzo: string;

  // Paso 4: Zona general
  zonaCuerpo: string;

  // Paso 5: Zona específica
  zonaEspecifica: string;

  // Paso 6: Ubicación del tatuaje
  marcasZona: MarcaZona[];

  // Paso 7: Descripción y referencia
  descripcion: string;
  imagenReferencia: File | null;

  // Paso 8: Información adicional
  tieneTatuajesPrevios: boolean | null;

  // Ubicación del cliente
  latitud?: number | null;
  longitud?: number | null;
  nombreUbicacion?: string;
  radioKm?: number;
}

export interface ArtistaCercanoItem {
  id: string;
  nombre: string;
  nombreArtistico: string | null;
  alias: string | null;
  ciudad: string | null;
  pais: string | null;
  direccion: string | null;
  radioAlcanceKm: number;
  distanciaKm: number;
  estilosPrincipales: string[];
  esEspecialista: boolean;
  estudio: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
}

export interface ResultadoArtistasCercanos {
  origen: { latitud: number; longitud: number };
  estiloSolicitado: string;
  radioBusquedaKm: number;
  artistasIdeales: ArtistaCercanoItem[];
  otrosArtistasCercanos: ArtistaCercanoItem[];
  totalCercanos: number;
}

export interface RespuestaEnvioCercanas {
  success: boolean;
  totalNotificados: number;
  artistasIdeales: ArtistaCercanoItem[];
  otrosArtistasCercanos: ArtistaCercanoItem[];
}

export interface PasoCotizacionProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}
