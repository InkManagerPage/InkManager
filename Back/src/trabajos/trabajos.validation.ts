import { HttpError } from "../errors/http-error.js";
import { validarEstilos } from "../estilos/estilos.service.js";
import { objetoEntrada, textoPerfil } from "../artistas/artistas.validation.js";
import type { Trabajo } from "./trabajos.entity.js";

export function validarIdTrabajo(id: unknown): string {
  if (
    typeof id !== "string" ||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)
  )
    throw new HttpError(400, "El identificador del trabajo no es válido.");
  return id;
}

export function validarTrabajo(
  entrada: unknown,
  tieneArchivo: boolean,
  anterior?: Trabajo,
): Pick<Trabajo, "descripcion" | "estilos" | "estado"> {
  const datos = objetoEntrada(entrada);
  const descripcion = textoPerfil(
    datos.descripcion ?? anterior?.descripcion ?? "",
    "La descripción",
    1200,
  );
  const estilos = validarEstilos(datos.estilos ?? anterior?.estilos ?? []);
  const estado = datos.estado ?? anterior?.estado ?? "BORRADOR";
  if (estado !== "BORRADOR" && estado !== "PUBLICADO")
    throw new HttpError(400, "El estado de publicación no es válido.");
  if (
    estado === "PUBLICADO" &&
    (!descripcion || !estilos.length || (!tieneArchivo && !anterior?.url))
  )
    throw new HttpError(
      400,
      "Para publicar necesitás una foto, descripción y al menos un estilo.",
    );
  return { descripcion, estilos, estado };
}
