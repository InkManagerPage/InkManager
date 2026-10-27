import { HttpError } from "../errors/http-error.js";
import * as ubicaciones from "./ubicaciones.repository.js";
import type { OpcionUbicacion, Pais } from "./ubicaciones.entity.js";

const nombresPaises = new Intl.DisplayNames(["es"], { type: "region" });
const nombrePais = (codigo: string) => nombresPaises.of(codigo) || codigo;
const ordenar = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, "es");

function validarPais(valor: unknown) {
  if (typeof valor !== "string" || !/^[A-Z]{2}$/.test(valor))
    throw new HttpError(400, "Elegí un país de la lista.");
  const pais = ubicaciones.buscarPais(valor);
  if (!pais) throw new HttpError(400, "Elegí un país de la lista.");
  return pais;
}
function validarId(valor: unknown): number {
  if (
    (typeof valor !== "number" && typeof valor !== "string") ||
    !/^\d+$/.test(String(valor)) ||
    !Number.isSafeInteger(Number(valor)) ||
    Number(valor) < 1
  ) {
    throw new HttpError(400, "La ubicación seleccionada no es válida.");
  }
  return Number(valor);
}

export function obtenerPaises(): Pais[] {
  return ubicaciones
    .listarPaises()
    .map((pais) => ({ codigo: pais.iso2, nombre: nombrePais(pais.iso2) }))
    .sort(ordenar);
}
export function obtenerProvincias(codigo: unknown): OpcionUbicacion[] {
  const pais = validarPais(codigo);
  return ubicaciones
    .listarProvincias(pais.id)
    .map((provincia) => ({ id: provincia.id, nombre: provincia.name }))
    .sort(ordenar);
}
export function obtenerCiudades(
  codigo: unknown,
  provinciaId: unknown,
): OpcionUbicacion[] {
  const pais = validarPais(codigo);
  const provincia = ubicaciones.buscarProvincia(validarId(provinciaId));
  if (!provincia || provincia.countryId !== pais.id)
    throw new HttpError(400, "Elegí una provincia del país seleccionado.");
  return ubicaciones
    .listarCiudades(provincia.id)
    .map((ciudad) => ({ id: ciudad.id, nombre: ciudad.name }))
    .sort(ordenar);
}

export function obtenerUbicacion(ciudadId: number | null | undefined) {
  const ciudad = ciudadId ? ubicaciones.buscarCiudad(ciudadId) : undefined;
  if (!ciudad) return null;
  return {
    ciudadId: ciudad.id,
    ciudad: ciudad.name,
    pais: ciudad.countryCode,
    provinciaId: ciudad.stateId,
    provincia: ciudad.stateName,
    ubicacion: [
      ...new Set([
        ciudad.name,
        ciudad.stateName,
        nombrePais(ciudad.countryCode),
      ]),
    ].join(", "),
  };
}

export function validarCiudad(valor: unknown) {
  if (valor === undefined || valor === null || valor === "")
    return { ciudadId: null, ciudad: null, pais: null };
  const ubicacion = obtenerUbicacion(validarId(valor));
  if (!ubicacion) throw new HttpError(400, "Elegí una ciudad de la lista.");
  return {
    ciudadId: ubicacion.ciudadId,
    ciudad: ubicacion.ciudad,
    pais: ubicacion.pais,
  };
}
