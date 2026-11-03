import type { Request, Response } from "express";
import { guardarMiCotizacion } from "./cotizaciones.service.js";
export async function guardar(req: Request, res: Response) {
  res.json(
    await guardarMiCotizacion(
      req.usuario!.id,
      req.params.id,
      req.body,
      req.file,
    ),
  );
}
