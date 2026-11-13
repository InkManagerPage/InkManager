import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import {
  listar,
  actualizar,
  crear,
  crearParaArtista,
  mostrarEstudio,
  mostrarArtista,
  mostrarEnlaceArtista,
  crearParaCercanos,
} from "./solicitudes.controller.js";
import { guardar } from "../cotizaciones/cotizaciones.controller.js";
import { upload, uploadSolicitud } from "../middlewares/multer.js";

export const solicitudesRouter = Router();

const cargarImagenesSolicitud = uploadSolicitud.fields([
  { name: "imagenZonaMarcada", maxCount: 1 },
  { name: "referencias", maxCount: 1 },
]);
const limitarEnvios = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Se recibieron demasiados intentos. Volvé a probar en unos minutos." },
});

solicitudesRouter.get("/publicas/:slug", mostrarEstudio);
solicitudesRouter.get("/publicas/artista/:id", mostrarArtista);
solicitudesRouter.post(
  "/publicas/cercanas",
  limitarEnvios,
  cargarImagenesSolicitud,
  crearParaCercanos,
);

solicitudesRouter.post(
  "/publicas/:slug",
  limitarEnvios,
  cargarImagenesSolicitud,
  crear,
);

solicitudesRouter.post(
  "/publicas/artista/:id",
  limitarEnvios,
  cargarImagenesSolicitud,
  crearParaArtista,
);

solicitudesRouter.use(
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  requerirPlanVigente,
);

solicitudesRouter.get("/", listar);
solicitudesRouter.get("/formulario", requerirRoles("ARTISTA"), mostrarEnlaceArtista);

solicitudesRouter.patch("/:id", actualizar);

solicitudesRouter.put(
  "/:id/cotizacion",
  requerirRoles("ARTISTA"),
  upload.single("imagen"),
  guardar,
);
