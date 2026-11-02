import { HttpError } from "../errors/http-error.js";
import {
  objetoEntrada,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import { validarEmail } from "../usuarios/usuarios.validation.js";
import type { InvitacionCompleta } from "./invitaciones-equipo.entity.js";
export function validarEmailInvitacion(entrada: unknown) {
  return validarEmail(objetoEntrada(entrada).email);
}
export function validarAccionInvitacion(
  entrada: unknown,
  acciones: readonly string[],
) {
  const b = objetoEntrada(entrada);
  if (!acciones.includes(String(b.accion)))
    throw new HttpError(400, "La acción de la invitación no es válida.");
  return { accion: String(b.accion), version: validarVersion(b) };
}
export function comprobarInvitacion(
  i: InvitacionCompleta,
  version: number,
  ahora = new Date(),
) {
  if (i.version !== version)
    throw new HttpError(
      409,
      "La invitación cambió. Actualizá la página antes de continuar.",
    );
  if (i.estado !== "PENDIENTE" || i.expiraAt <= ahora)
    throw new HttpError(
      409,
      "La invitación ya no está disponible. Pedile al estudio que te envíe una nueva.",
    );
}
