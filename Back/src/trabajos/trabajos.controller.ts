import type { Request, Response } from "express";
import {
  guardarMiTrabajo,
  eliminarMiTrabajo,
  obtenerMisTrabajos,
} from "./trabajos.service.js";

export async function misTrabajos(req: Request, res: Response): Promise<void> {
  res.json(await obtenerMisTrabajos(req.usuario!.id));
}
export async function crearMiTrabajo(
  req: Request,
  res: Response,
): Promise<void> {
  res
    .status(201)
    .json(await guardarMiTrabajo(req.usuario!.id, req.body, req.file));
}
export async function actualizarMiTrabajo(
  req: Request,
  res: Response,
): Promise<void> {
  res.json(
    await guardarMiTrabajo(req.usuario!.id, req.body, req.file, req.params.id),
  );
}
export async function borrarMiTrabajo(
  req: Request,
  res: Response,
): Promise<void> {
  await eliminarMiTrabajo(req.usuario!.id, req.params.id);
  res.status(204).end();
}
