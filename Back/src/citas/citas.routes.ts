import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { crear, actualizar, zonaHoraria } from "./citas.controller.js";
export const citasRouter = Router();
citasRouter.use(requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"));
citasRouter.post("/", crear);
citasRouter.patch("/zona-horaria", zonaHoraria);
citasRouter.patch("/:id", actualizar);
