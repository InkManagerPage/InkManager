import type { Request, Response, NextFunction } from "express";
import { obtenerUsuarioSesion } from "../auth/auth.service.js";
import { HttpError } from "../errors/http-error.js";

export async function requerirSesion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");

  try {
    req.usuario = await obtenerUsuarioSesion(req.cookies?.inkmanager_session);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Error al comprobar la sesión.");
    res.status(500).json({ error: "No pudimos comprobar la sesión." });
    return;
  }

  next();
}
