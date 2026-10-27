import { CountryStateCity as ubicaciones } from "@tansuasici/country-state-city";
import type { CiudadCatalogo } from "./ubicaciones.entity.js";

export function listarPaises() {
  const datos = ubicaciones.getAllCountries();
  return Array.isArray(datos) ? datos : [];
}
export const buscarPais = ubicaciones.getCountryByIso2.bind(ubicaciones);
export const buscarProvincia = ubicaciones.getStateById.bind(ubicaciones);
let ciudadesPorId: Map<number, CiudadCatalogo> | undefined;

export function buscarCiudad(id: number) {
  if (!ciudadesPorId) {
    const ciudades = ubicaciones.getAllCities();
    if (!Array.isArray(ciudades))
      throw new Error("No pudimos cargar el catálogo de ciudades.");
    ciudadesPorId = new Map(ciudades.map((ciudad) => [ciudad.id, ciudad]));
  }
  return ciudadesPorId.get(id);
}

export function listarProvincias(paisId: number) {
  const datos = ubicaciones.getStatesByCountryId(paisId);
  return Array.isArray(datos) ? datos : [];
}
export function listarCiudades(provinciaId: number) {
  const datos = ubicaciones.getCitiesByStateId(provinciaId);
  return Array.isArray(datos) ? datos : [];
}
