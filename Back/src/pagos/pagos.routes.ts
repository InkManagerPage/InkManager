import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { tieneAccesoAlPanel } from "./acceso-plan.js";
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
router.get("/acceso", requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"), async (req, res) => {
  res.json({ habilitado: await tieneAccesoAlPanel(req.usuario!) });
});
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
router.post(
  "/suscripcion/:id/verificar",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false }),
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
