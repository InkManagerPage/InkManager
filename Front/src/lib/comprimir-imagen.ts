const MB = 1024 * 1024;

export async function comprimirImagen(archivo: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
    throw new Error('Usá una imagen JPG, PNG o WebP.');
  }
  if (archivo.size > 10 * MB) throw new Error('La foto original supera los 10 MB.');

  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error('No pudimos abrir esa imagen. Probá con otra foto.');
  }
  const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const contexto = canvas.getContext('2d');
  if (!contexto) {
    imagen.close();
    throw new Error('No pudimos preparar la imagen.');
  }
  contexto.fillStyle = '#fff';
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  let comprimida: Blob | null = null;
  for (const calidad of [0.82, 0.65, 0.5]) {
    comprimida = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', calidad),
    );
    if (comprimida && comprimida.size <= MB) break;
  }
  if (!comprimida || comprimida.size > 2 * MB) {
    throw new Error('La imagen optimizada supera los 2 MB. Elegí una foto más pequeña.');
  }
  return new File([comprimida], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
  });
}
