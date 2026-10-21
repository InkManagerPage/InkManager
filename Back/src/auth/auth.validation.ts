import bcrypt from "bcryptjs";
import { HttpError } from "../errors/http-error.js";
import { validarEmail } from "../usuarios/usuarios.validation.js";
import type { LoginDto } from "./dto/login.dto.js";

export function validarLogin(entrada: unknown): LoginDto {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    throw new HttpError(400, "Los datos del login no son válidos.");
  }

  const datos = entrada as Record<string, unknown>;
  const email = validarEmail(datos.email);
  const password = datos.password;

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    bcrypt.truncates(password)
  ) {
    throw new HttpError(400, "La contraseña no es válida.");
  }

  return { email, password };
}
