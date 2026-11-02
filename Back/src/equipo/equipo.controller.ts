import type { Request, Response } from "express";
import { cambiarIntegrante } from "./equipo.service.js";
export async function actualizar(req: Request, res: Response) {
  res.json(await cambiarIntegrante(req.usuario!.id, req.params.id, req.body));
}
