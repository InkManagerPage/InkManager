import { HttpError } from "../errors/http-error.js";

export function validarIdConsulta(id: unknown): string {
  if (
    typeof id !== "string" ||
    !/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/i.test(
      id,
    )
  )
    throw new HttpError(400, "El identificador no es válido.");
  return id;
}
export function objetoEntrada(entrada: unknown): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    throw new HttpError(400, "Los datos no son válidos.");
  return entrada as Record<string, unknown>;
}
export function validarVersion(entrada: unknown): number {
  const version = objetoEntrada(entrada).version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0)
    throw new HttpError(400, "Indicá la versión de la consulta.");
  return version;
}