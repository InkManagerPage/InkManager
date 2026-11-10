import { HttpError } from "../errors/http-error.js";
import { GeneroCuerpo, TipoColor, ZonaCuerpoGeneral } from "@prisma/client";
import { validarEstilos } from "../estilos/estilos.service.js";

export function validarIdConsulta(id: unknown): string {
  if (
    typeof id !== "string" ||
    !/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/i.test(
      id,
    )
  )
    throw new HttpError(400, "El identificador no es válido.");
  return id;
}
export function objetoEntrada(entrada: unknown): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    throw new HttpError(400, "Los datos no son válidos.");
  return entrada as Record<string, unknown>;
}
export function validarVersion(entrada: unknown): number {
  const version = objetoEntrada(entrada).version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0)
    throw new HttpError(400, "Indicá la versión de la consulta.");
  return version;
}

export function validarSlugEstudio(valor: unknown) {
  if (typeof valor !== "string" || !/^[a-z0-9][a-z0-9-]{0,159}$/.test(valor))
    throw new HttpError(404, "No encontramos el estudio solicitado.");
  return valor;
}

function texto(valor: unknown, maximo: number, mensaje: string, requerido = true) {
  if (!requerido && (valor === undefined || valor === "")) return "";
  if (typeof valor !== "string" || valor.trim().length > maximo || (requerido && !valor.trim()))
    throw new HttpError(400, mensaje);
  return valor.trim();
}

function opcion<T extends string>(valor: unknown, opciones: readonly T[]): T {
  const seleccion = opciones.find((o) => o === valor);
  if (!seleccion) throw new HttpError(400, "Revisá el color y la zona del tatuaje.");
  return seleccion;
}

export function validarSolicitudPublica(entrada: unknown) {
  const datos = objetoEntrada(entrada);
  const [estilo] = validarEstilos([datos.estilo]);
  return {
    estilo: estilo!,
    tipoColor: opcion(datos.tipoColor, Object.values(TipoColor)),
    generoCuerpo: opcion(datos.generoCuerpo, Object.values(GeneroCuerpo)),
    zonaGeneral: opcion(datos.zonaGeneral, Object.values(ZonaCuerpoGeneral)),
    subZona: texto(datos.subZona, 80, "Indicá una zona específica válida."),
    tamano: texto(datos.tamano, 80, "El tamaño debe tener hasta 80 caracteres.", false),
    descripcion: texto(datos.descripcion, 1500, "Describí el tatuaje en hasta 1500 caracteres."),
    notas: texto(datos.notas, 400, "Las notas deben tener hasta 400 caracteres.", false),
  };
}
