import type { CotizacionValues } from '@/types/cotizacion';
import { apiFetch } from '@/lib/api-client';
import { comprimirImagen } from '@/lib/comprimir-imagen';

const generos: Record<string, string> = { Mujer: 'FEMENINO', Hombre: 'MASCULINO' };
const zonas: Record<string, string> = {
  Brazo: 'BRAZO',
  Mano: 'MANO',
  Torso: 'TORSO',
  Pierna: 'PIERNA',
  'Cabeza / Cuello': 'CABEZA_CUELLO',
};

async function construirFormData(values: CotizacionValues) {
  const data = new FormData();
  data.set('tipoColor', values.esColor ? 'COLOR' : 'BLACK_AND_GREY');
  data.set('estilo', values.estilo);
  data.set('generoCuerpo', generos[values.generoLienzo] ?? '');
  data.set('zonaGeneral', zonas[values.zonaCuerpo] ?? '');
  data.set('subZona', values.zonaEspecifica);
  data.set('tamano', values.tamanoProporcion);
  data.set('descripcion', values.descripcion);
  data.set(
    'notas',
    `Plazo deseado: ${values.tiempoEstimado}\nTatuajes previos: ${values.tieneTatuajesPrevios ? 'Sí' : 'No'}`,
  );
  if (values.imagenReferencia) {
    data.set('referencias', await comprimirImagen(values.imagenReferencia));
  }
  return data;
}

export async function crearSolicitud(values: CotizacionValues, slug: string, claveEnvio: string) {
  const body = await construirFormData(values);
  body.set('claveEnvio', claveEnvio);
  body.set('nombre', values.nombre);
  body.set('email', values.email);
  body.set('telefono', values.telefono);
  await apiFetch(`/consultas/publicas/${encodeURIComponent(slug)}`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(60000),
  });
}

export async function crearSolicitudParaArtista(values: CotizacionValues, artistaId: string) {
  await apiFetch(`/consultas/publicas/artista/${encodeURIComponent(artistaId)}`, {
    method: 'POST',
    body: await construirFormData(values),
    signal: AbortSignal.timeout(60000),
  });
}
