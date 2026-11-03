import { DateTime } from "luxon";
import { HttpError } from "../errors/http-error.js";
import { objetoEntrada } from "../solicitudes/solicitudes.validation.js";
import type { SemanaDisponible } from "./disponibilidad.entity.js";
export const minutosHorario = (h: string) =>
  h === "24:00" ? 1440 : Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
export function validarSemana(entrada: unknown): SemanaDisponible {
  if (!Array.isArray(entrada) || entrada.length !== 7)
    throw new HttpError(400, "Configurá los siete días de la semana.");
  const dias = new Set<number>();
  const semana = entrada.map((valor) => {
    const d = objetoEntrada(valor);
    if (
      typeof d.dia !== "number" ||
      !Number.isInteger(d.dia) ||
      d.dia < 1 ||
      d.dia > 7 ||
      dias.has(d.dia)
    )
      throw new HttpError(400, "Los días de la semana no son válidos.");
    dias.add(d.dia);
    if (!Array.isArray(d.rangos) || d.rangos.length > 8)
      throw new HttpError(400, "Cada día admite hasta ocho rangos horarios.");
    const rangos = d.rangos
      .map((valor) => {
        const r = objetoEntrada(valor);
        if (
          typeof r.desde !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.desde) ||
          typeof r.hasta !== "string" ||
          !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(r.hasta) ||
          minutosHorario(r.desde) >= minutosHorario(r.hasta)
        )
          throw new HttpError(
            400,
            "Cada rango debe empezar antes de terminar, dentro del mismo día.",
          );
        return { desde: r.desde, hasta: r.hasta };
      })
      .sort((a, b) => a.desde.localeCompare(b.desde));
    for (let i = 1; i < rangos.length; i++)
      if (
        minutosHorario(rangos[i]!.desde) < minutosHorario(rangos[i - 1]!.hasta)
      )
        throw new HttpError(
          400,
          "Los rangos de un mismo día no pueden superponerse.",
        );
    return { dia: d.dia, rangos };
  });
  return semana.sort((a, b) => a.dia - b.dia);
}
export function horarioPermitido(
  semana: SemanaDisponible,
  inicioAt: Date,
  finAt: Date,
  zonaHoraria: string,
) {
  if (finAt <= inicioAt) return false;
  const inicio = DateTime.fromJSDate(inicioAt).setZone(zonaHoraria),
    fin = DateTime.fromJSDate(finAt).setZone(zonaHoraria);
  const terminaMedianoche =
    fin.toFormat("HH:mm") === "00:00" &&
    fin.toISODate() === inicio.plus({ days: 1 }).toISODate();
  if (fin.toISODate() !== inicio.toISODate() && !terminaMedianoche)
    return false;
  const desde = inicio.hour * 60 + inicio.minute,
    hasta = terminaMedianoche ? 1440 : fin.hour * 60 + fin.minute;
  let cubierto = desde;
  for (const rango of semana.find((d) => d.dia === inicio.weekday)?.rangos ||
    []) {
    const a = minutosHorario(rango.desde),
      b = minutosHorario(rango.hasta);
    if (a > cubierto) break;
    if (b > cubierto) cubierto = b;
    if (cubierto >= hasta) return true;
  }
  return false;
}
export function comprobarVersionDisponibilidad(
  actual: number,
  entrada: number,
) {
  if (actual !== entrada)
    throw new HttpError(
      409,
      "La disponibilidad cambió. Actualizá la página antes de guardar.",
    );
}
