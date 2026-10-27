import type { Request, Response } from "express";
import {
  obtenerPaises,
  obtenerProvincias,
  obtenerCiudades,
} from "./ubicaciones.service.js";

export function paises(_req: Request, res: Response) {
  res.json(obtenerPaises());
}
export function provincias(req: Request, res: Response) {
  res.json(obtenerProvincias(req.query.pais));
}
export function ciudades(req: Request, res: Response) {
  res.json(obtenerCiudades(req.query.pais, req.query.provincia));
}
