import type { CotizacionValues } from '@/types/cotizacion';
import { apiFetch } from '@/lib/api-client';

function construirFormData(values: CotizacionValues): FormData {
  if (values.esColor === null) {
    throw new Error('Debes seleccionar el tipo de color.');
  }

  // Conversión del género corporal
  const genero = values.generoLienzo.trim().toUpperCase();

  const generos: Record<string, string> = {
    MUJER: 'FEMENINO',
    FEMENINO: 'FEMENINO',
    HOMBRE: 'MASCULINO',
    MASCULINO: 'MASCULINO',
  };

  const generoCuerpo = generos[genero];

  // Conversión de la zona general
  const zona = values.zonaCuerpo.trim().toUpperCase();

  const zonas: Record<string, string> = {
    BRAZO: 'BRAZO',
    MANO: 'MANO',
    TORSO: 'TORSO',
    PIERNA: 'PIERNA',
    'CABEZA / CUELLO': 'CABEZA_CUELLO',
    CABEZA_CUELLO: 'CABEZA_CUELLO',
  };

  const zonaGeneral = zonas[zona];

  if (!generoCuerpo || !zonaGeneral) {
    throw new Error('Hay datos del formulario que no son válidos.');
  }

  if (!values.estilo.trim() || !values.zonaEspecifica.trim()) {
    throw new Error('Faltan datos obligatorios del tatuaje.');
  }

  if (!values.descripcion.trim()) {
    throw new Error('Debes completar la descripción del tatuaje.');
  }

  const formData = new FormData();

  formData.append(
    'tipoColor',
    values.esColor ? 'COLOR' : 'BLACK_AND_GREY',
  );

  formData.append('estilo', values.estilo.trim());
  formData.append('generoCuerpo', generoCuerpo);
  formData.append('zonaGeneral', zonaGeneral);
  formData.append('subZona', values.zonaEspecifica.trim());
  formData.append('descripcion', values.descripcion.trim());

  const notas = [
    `Plazo deseado: ${values.tiempoEstimado || 'No especificado'}`,
    `¿Tiene tatuajes previos?: ${
      values.tieneTatuajesPrevios === null
        ? 'No especificado'
        : values.tieneTatuajesPrevios
          ? 'Sí'
          : 'No'
    }`,
  ].join('\n');

  formData.append('notas', notas);

  if (values.imagenZonaMarcada) {
    formData.append('imagenZonaMarcada', values.imagenZonaMarcada);
  }

  if (values.imagenReferencia) {
    formData.append('referencias', values.imagenReferencia);
  }

  return formData;
}

async function enviarSolicitud(endpoint: string, values: CotizacionValues) {
  const formData = construirFormData(values);

  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const responseData = await response.json().catch(() => null);

  if (!responseData?.success) {
    throw new Error(
      responseData?.message || 'La solicitud no pudo ser confirmada.',
    );
  }
}

// Solicitud general dirigida a un estudio.
export async function crearSolicitud(
  values: CotizacionValues,
  slug: string,
): Promise<void> {
  if (!slug.trim()) {
    throw new Error('No se pudo identificar el estudio.');
  }

  await enviarSolicitud(
    `/consultas/publicas/${encodeURIComponent(slug)}`,
    values,
  );
}

// Solicitud dirigida a un artista específico.
export async function crearSolicitudParaArtista(
  values: CotizacionValues,
  slug: string,
): Promise<void> {
  if (!slug.trim()) {
    throw new Error('No se pudo identificar al artista.');
  }

  await enviarSolicitud(
    `/consultas/publicas/artista/${encodeURIComponent(slug)}`,
    values,
  );
}
