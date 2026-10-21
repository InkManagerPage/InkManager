import { Rol } from "../types/roles.js";
import { HttpError } from "../errors/http-error.js";
import type { RegistroUsuarioDto } from "./dto/registro-usuario.dto.js";
import bcrypt from "bcryptjs";

export function validarRolRegistro(rol: unknown): RegistroUsuarioDto["rol"] {
  if (rol === Rol.CLIENTE || rol === Rol.ARTISTA || rol === Rol.ESTUDIO_ADMIN) {
    return rol;
  }
  throw new HttpError(400, "El rol seleccionado no es válido");
}

export function validarNombre(valor: unknown): string {
  // Valido que sea un string y que no esté vacío
  if (typeof valor !== "string") {
    throw new HttpError(400, "El nombre debe ser un texto");
  }

  // Quito espacios de los extremos y compruebo la longitud
  const nombre = valor.trim();

  if (nombre.length < 2 || nombre.length > 50) {
    throw new HttpError(400, "El nombre debe tener entre 2 y 50 caracteres");
  }

  return nombre;
}

export function validarEmail(valor: unknown): string {
  if (typeof valor !== "string") {
    throw new HttpError(400, "El email debe ser un texto");
  }

  const email = valor.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Compruebo que el email no supere los 254 caracteres y que cumpla con el formato de email
  if (email.length > 254 || !emailRegex.test(email)) {
    throw new HttpError(400, "El email no tiene un formato válido");
  }

  return email;
}

export function validarPassword(valor: unknown): string {
  if (typeof valor !== "string") {
    throw new HttpError(400, "La contraseña debe ser un texto");
  }
  if (valor.length < 15 || valor.trim().length === 0) {
    throw new HttpError(
      400,
      "La contraseña debe tener al menos 15 caracteres y no puede estar vacía",
    );
  }

  // Detecta si la contraseña supera los 72 bytes que bcrypt puede procesar, y si es así lanza un error
  if (bcrypt.truncates(valor)) {
    throw new HttpError(
      400,
      "La contraseña es demasiado larga para ser procesada",
    );
  }

  return valor;
}

export function validarRegistroUsuario(entrada: unknown): RegistroUsuarioDto {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    throw new HttpError(400, "Los datos del registro no son válidos");
  }

  const datos = entrada as Record<string, unknown>;

  const registro: RegistroUsuarioDto = {
    nombre: validarNombre(datos.nombre),
    email: validarEmail(datos.email),
    password: validarPassword(datos.password),
    rol: validarRolRegistro(datos.rol),
  };

  if (registro.rol === Rol.ARTISTA) {
    registro.nombreArtistico = validarNombre(datos.nombreArtistico);
  }

  if (registro.rol === Rol.ESTUDIO_ADMIN) {
    registro.nombreEstudio = validarNombre(datos.nombreEstudio);
  }

  return registro;
}
