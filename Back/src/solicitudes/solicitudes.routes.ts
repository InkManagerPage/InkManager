import { Router } from "express";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import {
  listar,
  actualizar,
  crear,
  crearParaArtista,
} from "./solicitudes.controller.js";
import { guardar } from "../cotizaciones/cotizaciones.controller.js";
import { upload } from "../middlewares/multer.js";

export const solicitudesRouter = Router();

const cargarImagenesSolicitud = upload.fields([
  { name: "imagenZonaMarcada", maxCount: 1 },
  { name: "referencias", maxCount: 1 },
]);

// Solicitud general dirigida a un estudio mediante su slug.
solicitudesRouter.post(
  "/publicas/:slug",
  requerirSesion,
  requerirRoles("CLIENTE"),
  cargarImagenesSolicitud,
  crear,
);

// Solicitud dirigida a un artista mediante su ID.
solicitudesRouter.post(
  "/publicas/artista/:slug",
  requerirSesion,
  requerirRoles("CLIENTE"),
  cargarImagenesSolicitud,
  crearParaArtista,
);

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
