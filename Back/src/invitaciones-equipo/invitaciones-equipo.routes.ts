import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import {
  crear,
  gestionar,
  responder,
} from "./invitaciones-equipo.controller.js";
const limitarEnvios = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 50,
  keyGenerator: (req) => req.usuario!.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Alcanzaste el límite de invitaciones. Intentá más tarde.",
  },
});
export const invitacionesEquipoRouter = Router();
invitacionesEquipoRouter.use(requerirSesion);
invitacionesEquipoRouter.post(
  "/",
  requerirRoles("ESTUDIO_ADMIN"),
  limitarEnvios,
  crear,
);
invitacionesEquipoRouter.patch(
  "/:id",
  requerirRoles("ESTUDIO_ADMIN"),
  limitarEnvios,
  gestionar,
);
invitacionesEquipoRouter.post(
  "/:id/respuesta",
  requerirRoles("ARTISTA"),
  responder,
);
