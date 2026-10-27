import { Router } from "express";
import { uploadImage } from "./imagenes.controller.js";
import { upload } from "../middlewares/multer.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { Rol } from "../types/roles.js";

export const imagenRouter = Router();

// Todos los roles pueden cargar referencias o imágenes propias, con sesión válida.
imagenRouter.post(
  "/",
  requerirSesion,
  requerirRoles(Rol.CLIENTE, Rol.ARTISTA, Rol.ESTUDIO_ADMIN, Rol.SUPERADMIN),
  upload.single("imagen"),
  uploadImage,
);
