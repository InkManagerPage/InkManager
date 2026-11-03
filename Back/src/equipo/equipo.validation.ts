import { HttpError } from "../errors/http-error.js";
import {
  objetoEntrada,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import type { CuentaEquipo, PendientesEquipo } from "./equipo.entity.js";

export function validarCambioEquipo(entrada: unknown) {
  const b = objetoEntrada(entrada),
    version = validarVersion(b);
  if (!["SUSPENDER", "HABILITAR", "DESVINCULAR"].includes(String(b.accion)))
    throw new HttpError(400, "La acción del equipo no es válida.");
  return {
    accion: b.accion as "SUSPENDER" | "HABILITAR" | "DESVINCULAR",
    version,
  };
}
export function validarIngreso(
  artista: CuentaEquipo,
  pendientes: PendientesEquipo,
) {
  if (artista.rol !== "ARTISTA")
    throw new HttpError(403, "La invitación requiere una cuenta de artista.");
  if (!artista.emailVerificado)
    throw new HttpError(
      403,
      "Verificá tu email antes de aceptar la invitación.",
    );
  if (artista.estudioId)
    throw new HttpError(
      409,
      "Ya pertenecés a un estudio. Primero deben desvincularte de ese equipo.",
    );
  if (pendientes.turnos || pendientes.consultas)
    throw new HttpError(
      409,
      `Resolvé tu trabajo independiente antes de incorporarte: ${pendientes.turnos} turnos pendientes y ${pendientes.consultas} consultas sin archivar.`,
    );
}
export function validarDesvinculacion(pendientes: PendientesEquipo) {
  if (pendientes.turnos || pendientes.consultas)
    throw new HttpError(
      409,
      `Antes de desvincular al artista, resolvé ${pendientes.turnos} turnos pendientes y reasigná o archivá ${pendientes.consultas} consultas.`,
    );
}
