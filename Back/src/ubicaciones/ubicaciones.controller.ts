import type { Request, Response } from "express";
import {
  obtenerPaises,
  obtenerProvincias,
  obtenerCiudades,
} from "./ubicaciones.service.js";
import { buscarArtistasCercanosPorEstilo } from "./geolocalizacion.service.js";

export function paises(_req: Request, res: Response) {
  res.json(obtenerPaises());
}
export function provincias(req: Request, res: Response) {
  res.json(obtenerProvincias(req.query.pais));
}
export function ciudades(req: Request, res: Response) {
  res.json(obtenerCiudades(req.query.pais, req.query.provincia));
}

export async function artistasCercanos(req: Request, res: Response) {
  const latitud = Number(req.query.lat);
  const longitud = Number(req.query.lng);
  const estilo = typeof req.query.estilo === "string" ? req.query.estilo : undefined;
  const radio = req.query.radio ? Number(req.query.radio) : undefined;

  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    res.status(400).json({ error: "Coordenadas inválidas. Proporcioná lat y lng numéricos." });
    return;
  }

  const resultado = await buscarArtistasCercanosPorEstilo({
    latitud,
    longitud,
    estilo,
    radioMaximoKm: Number.isFinite(radio) ? radio : 60,
  });

  res.json(resultado);
}
