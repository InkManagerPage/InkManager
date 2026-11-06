import { HttpError } from "../errors/http-error.js";

export interface DatosContacto {
  nombre: string;
  email: string;
  telefono: string | null;
  ciudad: string | null;
}

export function validarDatosContacto(entrada: unknown): DatosContacto {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    throw new HttpError(400, "Los datos del contacto no son válidos.");
  }

  const datos = entrada as Record<string, unknown>;

  if (typeof datos.nombre !== "string") {
    throw new HttpError(400, "El nombre debe ser un texto.");
  }

  const nombre = datos.nombre.trim().normalize("NFC").replace(/ +/g, " ");

  if (nombre.length < 2 || nombre.length > 50) {
    throw new HttpError(
      400,
      "El nombre debe tener entre 2 y 50 caracteres.",
    );
  }

  if (typeof datos.email !== "string") {
    throw new HttpError(400, "El email debe ser un texto.");
  }

  const email = datos.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email.length > 254 || !emailRegex.test(email)) {
    throw new HttpError(400, "El email no tiene un formato válido.");
  }

  let telefono: string | null = null;

  if (datos.telefono !== undefined && datos.telefono !== null) {
    if (typeof datos.telefono !== "string" || datos.telefono.length > 30) {
      throw new HttpError(400, "El teléfono no es válido.");
    }

    telefono = datos.telefono.trim() || null;
  }

  let ciudad: string | null = null;

  if (datos.ciudad !== undefined && datos.ciudad !== null) {
    if (typeof datos.ciudad !== "string" || datos.ciudad.length > 100) {
      throw new HttpError(400, "La ciudad no es válida.");
    }

    ciudad = datos.ciudad.trim() || null;
  }

  return {
    nombre,
    email,
    telefono,
    ciudad,
  };
}
