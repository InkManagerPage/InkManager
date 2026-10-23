import type { RequestHandler } from "express";
import { origenesPermitidos } from "../config/auth.js";
import { HttpError } from "../errors/http-error.js";

export const validarOrigen: RequestHandler = (req, _res, next) => {
  const origen = req.get("Origin");
  const modificaDatos = !["GET", "HEAD", "OPTIONS"].includes(req.method);

  if (modificaDatos && origen && !origenesPermitidos.includes(origen)) {
    next(new HttpError(403, "Origen no permitido."));
    return;
  }

  next();
};
