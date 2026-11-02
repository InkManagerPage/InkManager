import { DateTime, IANAZone } from "luxon";
import { HttpError } from "../errors/http-error.js";
import {
  objetoEntrada,
  validarIdConsulta,
} from "../solicitudes/solicitudes.validation.js";
import type { DatosCita } from "./citas.entity.js";

export function validarCita(entrada: unknown, zonaHoraria: string): DatosCita {
  const b = objetoEntrada(entrada);
  const solicitudId = validarIdConsulta(b.solicitudId);
  if (
    typeof b.titulo !== "string" ||
    b.titulo.trim().length < 3 ||
    b.titulo.trim().length > 100
  )
    throw new HttpError(400, "El trabajo debe tener entre 3 y 100 caracteres.");
  if (
    typeof b.fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha) ||
    typeof b.hora !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.hora)
  )
    throw new HttpError(400, "Elegí una fecha y hora válidas.");
  if (!IANAZone.isValidZone(zonaHoraria))
    throw new HttpError(400, "La zona horaria del negocio no es válida.");
  const local = `${b.fecha} ${b.hora}`;
  const inicio = DateTime.fromFormat(local, "yyyy-MM-dd HH:mm", {
    zone: zonaHoraria,
  });
  if (
    !inicio.isValid ||
    inicio.year < 2000 ||
    inicio.year > 2100 ||
    inicio.toFormat("yyyy-MM-dd HH:mm") !== local
  )
    throw new HttpError(
      400,
      "Ese horario no existe en la zona horaria del negocio.",
    );
  if (inicio.getPossibleOffsets().length > 1)
    throw new HttpError(
      400,
      "Ese horario se repite por un cambio de hora. Elegí otro horario.",
    );
  if (
    typeof b.duracion !== "number" ||
    !Number.isInteger(b.duracion) ||
    b.duracion < 30 ||
    b.duracion > 480
  )
    throw new HttpError(
      400,
      "La duración debe estar entre 30 minutos y 8 horas.",
    );
  const fin = inicio.plus({ minutes: b.duracion });
  if (
    fin.toISODate() !== inicio.toISODate() &&
    !(
      fin.toFormat("HH:mm") === "00:00" &&
      fin.toISODate() === inicio.plus({ days: 1 }).toISODate()
    )
  )
    throw new HttpError(400, "El turno debe terminar dentro del mismo día.");
  for (const key of ["importe", "sena"] as const) {
    if (
      typeof b[key] !== "number" ||
      !Number.isFinite(b[key]) ||
      b[key] < 0 ||
      b[key] > 100000000 ||
      !/^\d+(\.\d{1,2})?$/.test(String(b[key]))
    )
      throw new HttpError(
        400,
        "Ingresá importes válidos, con hasta dos decimales.",
      );
  }
  if ((b.sena as number) > (b.importe as number))
    throw new HttpError(400, "La seña no puede superar el importe del turno.");
  if (
    !["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"].includes(
      String(b.estado),
    )
  )
    throw new HttpError(400, "El estado del turno no es válido.");
  if (typeof b.notas !== "string" || b.notas.length > 1000)
    throw new HttpError(400, "Las notas pueden tener hasta 1000 caracteres.");
  const recordatorios =
    b.recordatorios === undefined ? {} : objetoEntrada(b.recordatorios);
  if (
    Object.entries(recordatorios).some(
      ([k, v]) =>
        !["TURNO", "CUIDADOS", "RESENA"].includes(k) || typeof v !== "boolean",
    )
  )
    throw new HttpError(
      400,
      "Las preferencias de recordatorios no son válidas.",
    );
  return {
    solicitudId,
    titulo: b.titulo.trim(),
    inicioAt: inicio.toJSDate(),
    finAt: fin.toJSDate(),
    importe: b.importe as number,
    sena: b.sena as number,
    estado: b.estado as DatosCita["estado"],
    notas: b.notas.trim(),
    recordatorios: Object.fromEntries(
      Object.entries(recordatorios).sort(),
    ) as Record<string, boolean>,
  };
}
export function validarTransicion(
  estado: string,
  siguiente: DatosCita["estado"],
  inicioAt: Date,
  ahora = new Date(),
) {
  if (["COMPLETADA", "CANCELADA"].includes(estado))
    throw new HttpError(
      409,
      "El turno ya está cerrado y no se puede modificar.",
    );
  if (
    siguiente === "COMPLETADA" &&
    (estado !== "CONFIRMADA" || inicioAt > ahora)
  )
    throw new HttpError(
      409,
      "Para completar el turno debe estar confirmado y haber comenzado.",
    );
}
