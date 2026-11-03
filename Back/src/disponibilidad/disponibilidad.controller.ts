import type { Request, Response } from "express";
import {
  obtenerDisponibilidad,
  guardarDisponibilidad,
} from "./disponibilidad.service.js";
export async function obtener(req: Request, res: Response) {
  res.json(await obtenerDisponibilidad(req.usuario!.id, req.params.artistaId));
}
export async function guardar(req: Request, res: Response) {
  res.json(
    await guardarDisponibilidad(
      req.usuario!.id,
      req.params.artistaId,
      req.body,
    ),
  );
}
