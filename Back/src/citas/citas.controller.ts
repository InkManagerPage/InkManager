import type { Request, Response } from "express";
import {
  crearTurno,
  actualizarTurno,
  guardarZonaHoraria,
} from "./citas.service.js";
export async function crear(req: Request, res: Response) {
  const resultado = await crearTurno(req.usuario!.id, req.body);
  res.status(resultado.creada ? 201 : 200).json(resultado.cita);
}
export async function actualizar(req: Request, res: Response) {
  res.json(await actualizarTurno(req.usuario!.id, req.params.id, req.body));
}
export async function zonaHoraria(req: Request, res: Response) {
  res.json(await guardarZonaHoraria(req.usuario!.id, req.body));
}
