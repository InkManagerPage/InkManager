import { HttpError } from "../errors/http-error.js";
import { estilosCatalogo, type Estilo } from "./estilos.entity.js";

export function validarEstilos(entrada: unknown): Estilo[] {
  let valor = entrada;
  if (typeof entrada === "string") {
    try {
      valor = JSON.parse(entrada);
    } catch {
      throw new HttpError(400, "Los estilos deben ser una lista válida.");
    }
  }
  if (
    !Array.isArray(valor) ||
    valor.length > estilosCatalogo.length ||
    valor.some(
      (estilo) =>
        typeof estilo !== "string" ||
        !estilosCatalogo.includes(estilo as Estilo),
    )
  ) {
    throw new HttpError(400, "Elegí estilos de la lista disponible.");
  }
  return [...new Set(valor)] as Estilo[];
}
