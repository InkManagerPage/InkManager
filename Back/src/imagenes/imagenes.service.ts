import { HttpError } from "../errors/http-error.js";
import { guardarImagen } from "./imagenes.repository.js";
import type { Imagen } from "./imagenes.entity.js";

interface ArchivoImagen {
  buffer: Buffer;
  mimetype: string;
}

export async function subirImagen(archivo?: ArchivoImagen): Promise<Imagen> {
  if (!archivo) {
    throw new HttpError(400, "No se envió ninguna imagen");
  }

  const png = archivo.buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = archivo.buffer
    .subarray(0, 3)
    .equals(Buffer.from([255, 216, 255]));
  const webp =
    archivo.buffer.toString("ascii", 0, 4) === "RIFF" &&
    archivo.buffer.toString("ascii", 8, 12) === "WEBP";
  const formatoCorrecto =
    (archivo.mimetype === "image/png" && png) ||
    (archivo.mimetype === "image/jpeg" && jpg) ||
    (archivo.mimetype === "image/webp" && webp);

  if (!formatoCorrecto) {
    throw new HttpError(
      400,
      "El archivo no corresponde a una imagen JPG, PNG o WebP válida.",
    );
  }

  const base64 = archivo.buffer.toString("base64");
  const dataUri = `data:${archivo.mimetype};base64,${base64}`;
  const imagen = await guardarImagen(dataUri);

  return { url: imagen.secure_url, public_id: imagen.public_id };
}
