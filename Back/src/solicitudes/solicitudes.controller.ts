import type { Request, Response } from "express";
import { cambiarSolicitud, obtenerBandeja } from "./solicitudes.service.js";
export async function listar(req: Request, res: Response) {
  res.json(await obtenerBandeja(req.usuario!.id));
}
export async function actualizar(req: Request, res: Response) {
  res.json(await cambiarSolicitud(req.usuario!.id, req.params.id, req.body));
}
