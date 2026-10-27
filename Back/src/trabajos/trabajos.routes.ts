import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { Rol } from "../types/roles.js";
import { upload } from "../middlewares/multer.js";
import {
  misTrabajos,
  crearMiTrabajo,
  actualizarMiTrabajo,
  borrarMiTrabajo,
} from "./trabajos.controller.js";

export const trabajosRouter = Router();
trabajosRouter.use(requerirSesion, requerirRoles(Rol.ARTISTA));
trabajosRouter.get("/", misTrabajos);
trabajosRouter.post("/", upload.single("imagen"), crearMiTrabajo);
trabajosRouter.patch("/:id", upload.single("imagen"), actualizarMiTrabajo);
trabajosRouter.delete("/:id", borrarMiTrabajo);
