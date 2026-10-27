import type { Request, Response } from "express";
import {
  actualizarPerfilArtista,
  obtenerPerfilArtista,
} from "./artistas.service.js";

export async function miPerfil(req: Request, res: Response): Promise<void> {
  res.json(await obtenerPerfilArtista(req.usuario!.id));
}

export async function actualizarMiPerfil(
  req: Request,
  res: Response,
): Promise<void> {
  res.json(await actualizarPerfilArtista(req.usuario!.id, req.body, req.file));
}
