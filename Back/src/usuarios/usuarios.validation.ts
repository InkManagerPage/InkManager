import { Rol } from "../types/roles.js";
import { HttpError } from "../errors/http-error.js";
import type {
  PerfilRegistroDto,
  RegistroUsuarioDto,
} from "./dto/registro-usuario.dto.js";
import bcrypt from "bcryptjs";
import { ModalidadCobro, TipoTrabajo } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { RegistroArtistaDto } from "./dto/registro-artista.dto.js";

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

export function validarPerfilRegistro(entrada: unknown): PerfilRegistroDto {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    throw new HttpError(400, "Los datos del registro no son válidos");
  }

  const datos = entrada as Record<string, unknown>;

  const rol = validarRolRegistro(datos.rol);

  if (rol === Rol.ARTISTA) {
    return { rol, nombreArtistico: validarNombre(datos.nombreArtistico) };
  }

  if (rol === Rol.ESTUDIO_ADMIN) {
    return { rol, nombreEstudio: validarNombre(datos.nombreEstudio) };
  }

  return { rol };
}

export function validarRegistroUsuario(entrada: unknown): RegistroUsuarioDto {
  const perfil = validarPerfilRegistro(entrada);
  const datos = entrada as Record<string, unknown>;

  return {
    nombre: validarNombre(datos.nombre),
    email: validarEmail(datos.email),
    password: validarPassword(datos.password),
    ...perfil,
  };
}

export function validarRegistroArtista(entrada: unknown) {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    throw new HttpError(400, "Los datos del registro no son válidos.");
  }

  const datos = entrada as Record<string, unknown>;
  const registro: RegistroArtistaDto & {
    nombre: string;
    email: string;
    password: string;
    nombreArtistico: string;
  } = {
    nombre: validarNombre(datos.nombre),
    email: validarEmail(datos.email),
    password: validarPassword(datos.password),
    nombreArtistico: validarNombre(datos.nombreArtistico),
  };

  const textos = [
    "alias",
    "telefono",
    "dniPasaporte",
    "direccion",
    "ciudad",
    "pais",
    "instagram",
    "tiktok",
    "sitioWeb",
    "politicaCancelacion",
    "cbuAliasBancario",
    "numeroLicencia",
    "licenciaSanitariaUrl",
    "documentoIdentidadUrl",
    "fotoPerfil",
    "fotoTrabajando",
  ] as const;
  for (const campo of textos) {
    const valor = datos[campo];
    if (valor === undefined || valor === null || valor === "") continue;
    if (typeof valor !== "string" || valor.length > 2048) {
      throw new HttpError(400, `Revisá el campo ${campo}.`);
    }
    registro[campo] = valor.trim();
  }

  for (const campo of [
    "sitioWeb",
    "licenciaSanitariaUrl",
    "documentoIdentidadUrl",
    "fotoPerfil",
    "fotoTrabajando",
  ] as const) {
    if (registro[campo]) validarUrl(registro[campo], campo);
  }

  const numeros = [
    ["radioAlcanceKm", 0, 10000, true],
    ["anosExperiencia", 0, 100, true],
    ["tarifaMinima", 0, 1000000000, false],
    ["montoPorcentajeSena", 0, 1000000000, false],
    ["tamanoMinimoCm", 1, 1000, true],
  ] as const;
  for (const [campo, minimo, maximo, entero] of numeros) {
    const valor = datos[campo];
    if (
      valor === undefined ||
      valor === null ||
      (typeof valor === "string" && !valor.trim())
    )
      continue;
    const numero =
      typeof valor === "number" || typeof valor === "string"
        ? Number(valor)
        : NaN;
    if (
      !Number.isFinite(numero) ||
      numero < minimo ||
      numero > maximo ||
      (entero && !Number.isInteger(numero))
    ) {
      throw new HttpError(400, `Revisá el valor de ${campo}.`);
    }
    registro[campo] = numero;
  }

  for (const campo of [
    "requiereSena",
    "aceptaDeclaracionHigiene",
    "aceptaCoverUp",
    "aceptaCicatrices",
    "aceptaRetoques",
    "aceptaCaraManos",
    "copiaDisenosInternet",
  ] as const) {
    const valor = datos[campo];
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== "boolean")
      throw new HttpError(400, `Revisá la opción ${campo}.`);
    registro[campo] = valor;
  }

  if (
    datos.tipoTrabajo !== undefined &&
    datos.tipoTrabajo !== null &&
    datos.tipoTrabajo !== ""
  ) {
    if (
      !Object.values(TipoTrabajo).some((valor) => valor === datos.tipoTrabajo)
    ) {
      throw new HttpError(400, "La modalidad de trabajo no es válida.");
    }
    registro.tipoTrabajo = datos.tipoTrabajo as TipoTrabajo;
  }
  if (
    datos.modalidadCobro !== undefined &&
    datos.modalidadCobro !== null &&
    datos.modalidadCobro !== ""
  ) {
    if (
      !Object.values(ModalidadCobro).some(
        (valor) => valor === datos.modalidadCobro,
      )
    ) {
      throw new HttpError(400, "La modalidad de cobro no es válida.");
    }
    registro.modalidadCobro = datos.modalidadCobro as ModalidadCobro;
  }

  for (const campo of ["estilosPrincipales", "metodosPagoAceptados"] as const) {
    const valor = datos[campo];
    if (valor === undefined || valor === null) continue;
    if (
      !Array.isArray(valor) ||
      valor.length > 30 ||
      !valor.every(
        (item) =>
          typeof item === "string" &&
          item.trim().length > 0 &&
          item.length <= 100,
      )
    ) {
      throw new HttpError(
        400,
        `El campo ${campo} debe ser una lista de textos.`,
      );
    }
    registro[campo] = valor.map((item) => item.trim());
  }

  if (datos.horariosAtencion !== undefined && datos.horariosAtencion !== null) {
    if (typeof datos.horariosAtencion !== "object")
      throw new HttpError(400, "Los horarios deben tener un formato válido.");
    registro.horariosAtencion = datos.horariosAtencion as Prisma.InputJsonValue;
  }
  if (datos.galeria !== undefined && datos.galeria !== null) {
    if (!Array.isArray(datos.galeria) || datos.galeria.length > 30)
      throw new HttpError(400, "La galería admite hasta 30 imágenes.");
    registro.galeria = datos.galeria.map((foto) => {
      if (
        typeof foto !== "object" ||
        foto === null ||
        typeof foto.url !== "string"
      )
        throw new HttpError(400, "Revisá las imágenes de la galería.");
      validarUrl(foto.url, "galería");
      if (
        foto.esCicatrizado !== undefined &&
        typeof foto.esCicatrizado !== "boolean"
      )
        throw new HttpError(400, "Revisá el estado de la foto de la galería.");
      return { url: foto.url, esCicatrizado: foto.esCicatrizado ?? false };
    });
  }

  return registro;
}

function validarUrl(valor: string, campo: string): void {
  try {
    const url = new URL(valor);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new HttpError(400, `La dirección de ${campo} no es válida.`);
  }
}
