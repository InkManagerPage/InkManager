import { DateTime } from "luxon";
import { HttpError } from "../errors/http-error.js";
import { objetoEntrada } from "../solicitudes/solicitudes.validation.js";
import type { DatosBloqueo } from "./bloqueos-agenda.entity.js";
function fecha(valor: unknown, zona: string) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
    throw new HttpError(400, "Elegí fechas válidas para el bloqueo.");
  const d = DateTime.fromISO(valor, { zone: zona });
  if (!d.isValid || d.year < 2000 || d.year > 2100 || d.toISODate() !== valor)
    throw new HttpError(400, "La fecha del bloqueo no es válida.");
  return d;
}
function hora(dia: DateTime, valor: unknown) {
  if (typeof valor !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor))
    throw new HttpError(400, "Elegí horas válidas para el bloqueo.");
  const local = `${dia.toISODate()} ${valor}`,
    d = DateTime.fromFormat(local, "yyyy-MM-dd HH:mm", { zone: dia.zoneName! });
  if (
    !d.isValid ||
    d.toFormat("yyyy-MM-dd HH:mm") !== local ||
    d.getPossibleOffsets().length > 1
  )
    throw new HttpError(
      400,
      "Ese horario no existe o se repite por un cambio de hora. Elegí otro horario.",
    );
  return d;
}
export function validarBloqueo(
  entrada: unknown,
  zonaHoraria: string,
): DatosBloqueo {
  const b = objetoEntrada(entrada);
  if (
    typeof b.motivo !== "string" ||
    b.motivo.trim().length < 1 ||
    b.motivo.trim().length > 120
  )
    throw new HttpError(400, "El motivo debe tener entre 1 y 120 caracteres.");
  if (typeof b.diaCompleto !== "boolean")
    throw new HttpError(400, "Indicá si el bloqueo ocupa días completos.");
  const desde = fecha(b.desdeFecha, zonaHoraria),
    hasta = fecha(b.hastaFecha, zonaHoraria);
  const inicio = b.diaCompleto
      ? desde.startOf("day")
      : hora(desde, b.desdeHora),
    fin = b.diaCompleto
      ? hasta.plus({ days: 1 }).startOf("day")
      : hora(hasta, b.hastaHora);
  if (hasta.toISODate()! < desde.toISODate()! || fin <= inicio)
    throw new HttpError(
      400,
      "El final del bloqueo debe ser posterior al inicio.",
    );
  return {
    motivo: b.motivo.trim(),
    inicioAt: inicio.toJSDate(),
    finAt: fin.toJSDate(),
    diaCompleto: b.diaCompleto,
  };
}
