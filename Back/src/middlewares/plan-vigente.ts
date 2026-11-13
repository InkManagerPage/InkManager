import type { RequestHandler } from "express";
import { HttpError } from "../errors/http-error.js";
import { tieneAccesoAlPanel } from "../pagos/acceso-plan.js";

export const requerirPlanVigente: RequestHandler = async (req, _res, next) => {
  const usuario = req.usuario;
  if (!usuario) throw new HttpError(401, "Debés iniciar sesión.");
  if (usuario.rol !== "ARTISTA" && usuario.rol !== "ESTUDIO_ADMIN") return next();
  if (!(await tieneAccesoAlPanel(usuario))) {
    throw new HttpError(403, usuario.rol === "ARTISTA" && usuario.estudioId
      ? "Necesitás que tu estudio tenga un plan vigente y que tu membresía esté habilitada."
      : "Suscribite a un plan para acceder a esta funcionalidad.");
  }
  next();
};
