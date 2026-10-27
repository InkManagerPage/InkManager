import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { upload } from "../middlewares/multer.js";
import { Rol } from "../types/roles.js";
import { miPerfil, actualizarMiPerfil } from "./artistas.controller.js";

export const artistasRouter = Router();
artistasRouter.use(requerirSesion, requerirRoles(Rol.ARTISTA));
artistasRouter.get("/perfil", miPerfil);
artistasRouter.put("/perfil", upload.single("imagen"), actualizarMiPerfil);
