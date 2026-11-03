
import type { CotizacionValues } from '@/types/cotizacion';

export async function crearSolicitud(
  values: CotizacionValues
): Promise<void> {
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

  if (!values.nombre.trim() || !values.email.trim()) {
    throw new Error('Debes completar tus datos de contacto.');
  }

  const email = values.email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('El correo electrónico no es válido.');
  }

  const formData = new FormData();

  // Datos correspondientes a Solicitud
  formData.append(
    'tipoColor',
    values.esColor ? 'COLOR' : 'BLACK_AND_GREY'
  );

  formData.append('estilo', values.estilo.trim());
  formData.append('generoCuerpo', generoCuerpo);
  formData.append('zonaGeneral', zonaGeneral);
  formData.append('subZona', values.zonaEspecifica.trim());
  formData.append('tamano', values.tamanoProporcion.trim());
  formData.append('descripcion', values.descripcion.trim());

  // Información complementaria
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

  // Datos correspondientes a Contacto
  formData.append('nombre', values.nombre.trim());
  formData.append('email', email);
  formData.append('telefono', values.telefono.trim());
  formData.append('ciudad', values.ciudad.trim());

  // Imagen de ubicación corporal
  if (values.imagenZonaMarcada) {
    formData.append(
      'imagenZonaMarcada',
      values.imagenZonaMarcada
    );
  }

  // Imagen de referencia del diseño
  if (values.imagenReferencia) {
    formData.append(
      'referencias',
      values.imagenReferencia
    );
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  if (!API_URL) {
    throw new Error('No está configurada la URL de la API.');
  }

  const response = await fetch(
    `${API_URL.replace(/\/$/, '')}/api/consultas/publicas`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.message || 'Error al crear la solicitud.'
    );
  }
}
