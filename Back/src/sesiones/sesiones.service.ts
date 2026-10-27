import { crearSesion, buscarSesionPorId } from "./sesiones.repository.js";

import { duracionSesionSegundos } from "../config/auth.js";
import { HttpError } from "../errors/http-error.js";

export async function abrirSesion(usuarioId: string) {
  const expiraAt = new Date(Date.now() + duracionSesionSegundos * 1000);

  return crearSesion(usuarioId, expiraAt);
}

export async function validarSesion(sesionId: string, usuarioId: string) {
  const sesion = await buscarSesionPorId(sesionId);

  if (
    !sesion ||
    sesion.usuarioId !== usuarioId ||
    sesion.revocadaAt !== null ||
    sesion.expiraAt.getTime() <= Date.now()
  ) {
    throw new HttpError(401, "Sesión inválida o vencida.");
  }

  return sesion;
}
