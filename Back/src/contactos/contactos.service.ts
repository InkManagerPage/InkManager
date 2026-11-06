import { HttpError } from "../errors/http-error.js";
import {
  obtenerOCrearContacto as obtenerOCrearContactoRepository,
  type PrismaContactoClient,
} from "./contactos.repository.js";
import { validarDatosContacto } from "./contactos.validation.js";

export async function obtenerOCrearContacto(
  estudioId: string,
  entrada: unknown,
  client?: PrismaContactoClient,
) {
  if (!estudioId || typeof estudioId !== "string") {
    throw new HttpError(400, "El estudio no es válido.");
  }

  const datos = validarDatosContacto(entrada);

  return obtenerOCrearContactoRepository(
    {
      estudioId,
      ...datos,
    },
    client,
  );
}
