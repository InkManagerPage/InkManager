import { IANAZone } from "luxon";
import { HttpError } from "../errors/http-error.js";
import { objetoEntrada } from "../solicitudes/solicitudes.validation.js";

export const tiposCliente = ["TURNO", "CUIDADOS", "RESENA"] as const;
export const tiposCuenta = [
  "AGENDA",
  "RESUMEN_SEMANAL",
  "RESUMEN_MENSUAL",
] as const;
export const tipos = [...tiposCliente, ...tiposCuenta] as const;
export type TipoCliente = (typeof tiposCliente)[number];
export type TipoCuenta = (typeof tiposCuenta)[number];
type Tipo = (typeof tipos)[number];
export type Regla = {
  activo: boolean;
  asunto: string;
  mensaje: string;
  horas: number;
  dias: number;
  hora: string;
  diaSemana: number;
  momentoAgenda: "ANTERIOR" | "MISMO_DIA";
};
export type Preferencias = {
  clientesHabilitados: boolean;
  artistaHabilitado: boolean;
  zonaHoraria: string;
  reglas: Record<Tipo, Regla>;
};

function entero(v: unknown, minimo: number, maximo: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < minimo || v > maximo)
    throw new HttpError(400, "El plazo del recordatorio no es válido.");
  return v;
}
function validarRegla(tipo: Tipo, entrada: unknown): Regla {
  const r = objetoEntrada(entrada);
  if (
    typeof r.activo !== "boolean" ||
    typeof r.asunto !== "string" ||
    typeof r.mensaje !== "string" ||
    r.asunto.trim().length < 3 ||
    r.asunto.length > 120 ||
    /[\r\n]/.test(r.asunto) ||
    r.mensaje.trim().length < 10 ||
    r.mensaje.length > 3000 ||
    typeof r.hora !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora) ||
    (r.momentoAgenda !== "ANTERIOR" && r.momentoAgenda !== "MISMO_DIA")
  )
    throw new HttpError(
      400,
      "Revisá el contenido y el horario del recordatorio.",
    );
  const variables =
    tipo === "AGENDA"
      ? ["artista", "fecha", "agenda"]
      : tipo === "RESUMEN_SEMANAL" || tipo === "RESUMEN_MENSUAL"
        ? ["artista", "resumen"]
        : ["cliente", "artista", "fecha", "hora", "trabajo"];
  for (const m of (r.asunto + " " + r.mensaje).matchAll(
    /\{\{\s*([^}]+)\s*\}\}/g,
  ))
    if (!variables.includes(m[1]!.trim()))
      throw new HttpError(400, "El correo contiene una variable no válida.");
  return {
    activo: r.activo,
    asunto: r.asunto.trim(),
    mensaje: r.mensaje.trim(),
    horas: entero(r.horas, tipo === "TURNO" ? 1 : 0, 168),
    dias: entero(r.dias, 1, 30),
    hora: r.hora,
    diaSemana: entero(r.diaSemana, 0, 6),
    momentoAgenda: r.momentoAgenda,
  };
}
export function validarPreferencias(entrada: unknown): Preferencias {
  const p = objetoEntrada(entrada);
  if (
    typeof p.clientesHabilitados !== "boolean" ||
    typeof p.artistaHabilitado !== "boolean" ||
    typeof p.zonaHoraria !== "string" ||
    !IANAZone.isValidZone(p.zonaHoraria)
  )
    throw new HttpError(400, "La configuración de recordatorios no es válida.");
  const reglas = objetoEntrada(p.reglas);
  return {
    clientesHabilitados: p.clientesHabilitados,
    artistaHabilitado: p.artistaHabilitado,
    zonaHoraria: p.zonaHoraria,
    reglas: Object.fromEntries(
      tipos.map((t) => [t, validarRegla(t, reglas[t])]),
    ) as Preferencias["reglas"],
  };
}
export function validarExcepciones(entrada: unknown) {
  const r = objetoEntrada(entrada);
  const excepciones: Partial<Record<TipoCliente, boolean>> = {};
  for (const [k, valor] of Object.entries(r)) {
    if (
      !(tiposCliente as readonly string[]).includes(k) ||
      typeof valor !== "boolean"
    )
      throw new HttpError(400, "Las preferencias del contacto no son válidas.");
    excepciones[k as TipoCliente] = valor;
  }
  return excepciones;
}
