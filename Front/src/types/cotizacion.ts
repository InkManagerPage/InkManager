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
}

export interface PasoCotizacionProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}
