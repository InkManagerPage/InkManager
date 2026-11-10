import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import {
  cancelarPagoInmediatamente,
  cancelarPago,
  consultarPago,
  consultarSuscripcion,
  iniciarPago,
  listarPlanes,
} from "./pagos.controller.js";

const router = Router();
const limitarOperacionesPago = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/planes", listarPlanes);
router.post(
  "/crear-suscripcion",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  limitarOperacionesPago,
  iniciarPago,
);
router.get(
  "/suscripcion/:id",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  consultarPago,
);
router.post("/cancelar-suscripcion", limitarOperacionesPago, cancelarPago);
router.post(
  "/cancelar-suscripcion-inmediatamente",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  limitarOperacionesPago,
  cancelarPagoInmediatamente,
);
router.get("/suscripcion", requerirSesion, consultarSuscripcion);

export const pagosRouter = router;
