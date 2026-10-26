import type { PublicoRegistro, RegisterValues } from '@/types/forms';

export function crearValoresRegistro(contexto: PublicoRegistro): RegisterValues {
  return {
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: contexto === 'cliente' ? 'CLIENTE' : 'ARTISTA',
    nombreArtistico: '',
    nombreEstudio: '',
  };
}
