import type { Request, Response } from "express";
import { estilosCatalogo } from "./estilos.entity.js";

export function listarEstilos(_req: Request, res: Response): void {
  res.json(estilosCatalogo);
}
