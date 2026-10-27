import cloudinary from "../config/cloudinary.js";

export function guardarImagen(dataUri: string) {
  return cloudinary.uploader.upload(dataUri, {
    folder: "inkmanager/referencias",
    format: "webp",
    transformation: [
      {
        width: 1600,
        height: 1600,
        crop: "limit",
        quality: "auto:good",
      },
    ],
  });
}

export async function eliminarImagenSegura(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.error("No se pudo eliminar una imagen reemplazada de Cloudinary.");
  }
}
