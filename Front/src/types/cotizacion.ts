export interface CotizacionValues {
  nombre: string;
  email: string;
  telefono: string;
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

  // Paso 7: Descripción y referencia
  tamanoProporcion: string;
  descripcion: string;
  imagenReferencia: File | null;

  // Paso 8: Información adicional
  tiempoEstimado: string;
  tieneTatuajesPrevios: boolean | null;
}
