import cloudinary from '../config/cloudinary.js';

export function guardarImagen(dataUri: string) {
  return cloudinary.uploader.upload(dataUri, {
    folder: 'inkmanager/referencias',
  });
}
