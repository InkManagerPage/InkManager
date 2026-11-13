import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import { actualizar } from "./equipo.controller.js";
export const equipoRouter = Router();
equipoRouter.use(requerirSesion, requerirRoles("ESTUDIO_ADMIN"), requerirPlanVigente);
equipoRouter.patch("/:id", actualizar);
