const carpeta = 'https://res.cloudinary.com/t4xfjphx/image/upload';

export function fotoFormulario(referencia: string, ancho: number) {
  return `${carpeta}/c_limit,w_${ancho},f_auto,q_auto/inkmanager/formulario/${referencia}`;
}
