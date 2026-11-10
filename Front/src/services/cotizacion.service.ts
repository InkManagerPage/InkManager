import type { CotizacionValues } from '@/types/cotizacion';
import { apiFetch } from '@/lib/api-client';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import { exportarZonaMarcada, modeloCorporal } from '@/lib/ubicacion-tatuaje';

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
  data.set('descripcion', values.descripcion);
  data.set('notas', `Tatuajes previos: ${values.tieneTatuajesPrevios ? 'Sí' : 'No'}`);
  const modelo = modeloCorporal(values.generoLienzo, values.zonaCuerpo, values.zonaEspecifica);
  const [zonaMarcada, referencia] = await Promise.all([
    exportarZonaMarcada(modelo.src, values.marcasZona),
    values.imagenReferencia ? comprimirImagen(values.imagenReferencia) : null,
  ]);
  data.set('imagenZonaMarcada', zonaMarcada);
  if (referencia) data.set('referencias', referencia);
  return data;
}

export async function crearSolicitud(
  values: CotizacionValues,
  destino: { estudio: string } | { artista: string },
  claveEnvio: string,
  enlaceInstagram?: string,
) {
  const body = await construirFormData(values);
  body.set('claveEnvio', claveEnvio);
  body.set('nombre', values.nombre);
  body.set('email', values.email);
  body.set('telefono', values.telefono);
  body.set('promociones', String(values.promociones));
  if (enlaceInstagram !== undefined) body.set('enlaceInstagram', enlaceInstagram);
  const ruta =
    'estudio' in destino
      ? encodeURIComponent(destino.estudio)
      : `artista/${encodeURIComponent(destino.artista)}`;
  await apiFetch(`/consultas/publicas/${ruta}`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(60000),
  });
}
