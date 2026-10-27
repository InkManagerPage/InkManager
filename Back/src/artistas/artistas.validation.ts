import { HttpError } from "../errors/http-error.js";
import { validarEstilos } from "../estilos/estilos.service.js";
import { validarCiudad } from "../ubicaciones/ubicaciones.service.js";

export function objetoEntrada(entrada: unknown): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    throw new HttpError(400, "Los datos no son válidos.");
  return entrada as Record<string, unknown>;
}

export function textoPerfil(
  valor: unknown,
  nombre: string,
  maximo: number,
): string {
  if (typeof valor !== "string" || valor.trim().length > maximo)
    throw new HttpError(
      400,
      `${nombre} debe ser un texto de hasta ${maximo} caracteres.`,
    );
  return valor.trim();
}

export function validarPerfilArtista(entrada: unknown) {
  const datos = objetoEntrada(entrada);
  if (datos.ciudad && !datos.ciudadId)
    throw new HttpError(400, "Elegí una ciudad de la lista.");
  const nombreArtistico = textoPerfil(
    datos.nombreArtistico,
    "El nombre artístico",
    50,
  );
  if (nombreArtistico && nombreArtistico.length < 2)
    throw new HttpError(
      400,
      "El nombre artístico debe tener al menos 2 caracteres.",
    );
  return {
    nombreArtistico,
    ...validarCiudad(datos.ciudadId),
    biografia: textoPerfil(datos.biografia, "La biografía", 300),
    estilosPrincipales: validarEstilos(datos.estilosPrincipales),
  };
}
