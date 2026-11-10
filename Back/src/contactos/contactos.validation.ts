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

  if (nombre.length < 2 || nombre.length > 80) {
    throw new HttpError(
      400,
      "El nombre debe tener entre 2 y 80 caracteres.",
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
    if (telefono && (!/^[+\d\s()-]+$/.test(telefono) || telefono.replace(/\D/g, "").length < 7))
      throw new HttpError(400, "Ingresá un teléfono válido.");
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

export function validarContactoPresupuesto(entrada: unknown): DatosContacto {
  const contacto = validarDatosContacto(entrada);
  const telefono = contacto.telefono?.replace(/[\s()-]/g, "");
  if (!telefono || !/^\+[1-9]\d{7,14}$/.test(telefono))
    throw new HttpError(400, "Ingresá el teléfono con código de país, por ejemplo +54 9 11 1234 5678.");
  return { ...contacto, telefono };
}
