import type { Usuario, Estudio } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";
import type { AmbitoConsultas } from "./solicitudes.entity.js";

export type CuentaConsultas = Pick<
  Usuario,
  | "id"
  | "rol"
  | "nombre"
  | "nombreArtistico"
  | "estudioId"
  | "estadoEnEstudio"
  | "zonaHoraria"
  | "email"
  | "emailVerificado"
> & {
  estudio: Pick<
    Estudio,
    "id" | "nombre" | "propietarioId" | "zonaHoraria"
  > | null;
};

export function ambitoDeCuenta(
  usuario: CuentaConsultas | null | undefined,
): AmbitoConsultas {
  if (!usuario) throw new HttpError(401, "Debés iniciar sesión.");
  if (usuario.rol === "ESTUDIO_ADMIN") {
    if (!usuario.estudio || usuario.estudio.propietarioId !== usuario.id)
      throw new HttpError(
        403,
        "Tu cuenta no tiene un estudio propio asociado.",
      );
    return {
      usuarioId: usuario.id,
      tipo: "ESTUDIO",
      estudioId: usuario.estudio.id,
      nombre: usuario.estudio.nombre,
      administra: true,
      puedeProponer: false,
      zonaHoraria:
        usuario.estudio.zonaHoraria || "America/Argentina/Buenos_Aires",
      email: usuario.email,
      emailVerificado: usuario.emailVerificado,
    };
  }
  if (usuario.rol !== "ARTISTA")
    throw new HttpError(403, "No tenés acceso a estas consultas.");
  return {
    usuarioId: usuario.id,
    tipo: usuario.estudio ? "ESTUDIO" : "INDEPENDIENTE",
    estudioId: usuario.estudioId,
    nombre:
      usuario.estudio?.nombre ||
      usuario.nombreArtistico ||
      usuario.nombre ||
      "Mi espacio",
    administra: !usuario.estudioId,
    puedeProponer: !usuario.estudioId || usuario.estadoEnEstudio === "ACTIVO",
    zonaHoraria:
      usuario.estudio?.zonaHoraria ||
      usuario.zonaHoraria ||
      "America/Argentina/Buenos_Aires",
    email: usuario.email,
    emailVerificado: usuario.emailVerificado,
  };
}
