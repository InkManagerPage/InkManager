import type { Request, Response } from "express";
import { obtenerCatalogo } from "./catalogo.service.js";

export async function catalogoPublico(
  _req: Request,
  res: Response,
): Promise<void> {
  res.set("Cache-Control", "no-store").json(await obtenerCatalogo());
}
