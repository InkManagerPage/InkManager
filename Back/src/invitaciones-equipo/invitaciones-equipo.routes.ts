import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import {
  crear,
  gestionar,
  listarRecibidas,
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
invitacionesEquipoRouter.get("/recibidas", requerirRoles("ARTISTA"), listarRecibidas);
invitacionesEquipoRouter.post(
  "/",
  requerirRoles("ESTUDIO_ADMIN"),
  requerirPlanVigente,
  limitarEnvios,
  crear,
);
invitacionesEquipoRouter.patch(
  "/:id",
  requerirRoles("ESTUDIO_ADMIN"),
  requerirPlanVigente,
  limitarEnvios,
  gestionar,
);
invitacionesEquipoRouter.post(
  "/:id/respuesta",
  requerirRoles("ARTISTA"),
  responder,
);
