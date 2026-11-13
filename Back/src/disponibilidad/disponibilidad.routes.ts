import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import { obtener, guardar } from "./disponibilidad.controller.js";
import {
  crear,
  editar,
  quitar,
} from "../bloqueos-agenda/bloqueos-agenda.controller.js";
export const disponibilidadRouter = Router();
disponibilidadRouter.use(
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  requerirPlanVigente,
);
disponibilidadRouter.get("/:artistaId", obtener);
disponibilidadRouter.put("/:artistaId", guardar);
disponibilidadRouter.post("/:artistaId/bloqueos", crear);
disponibilidadRouter.patch("/:artistaId/bloqueos/:bloqueoId", editar);
disponibilidadRouter.delete("/:artistaId/bloqueos/:bloqueoId", quitar);
