import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { listar, actualizar } from "./solicitudes.controller.js";
import { guardar } from "../cotizaciones/cotizaciones.controller.js";
import { upload } from "../middlewares/multer.js";
export const solicitudesRouter = Router();
solicitudesRouter.use(
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
);
solicitudesRouter.get("/", listar);
solicitudesRouter.patch("/:id", actualizar);
solicitudesRouter.put(
  "/:id/cotizacion",
  requerirRoles("ARTISTA"),
  upload.single("imagen"),
  guardar,
);
