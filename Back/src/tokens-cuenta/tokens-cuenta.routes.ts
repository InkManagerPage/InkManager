import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  cambiarPassword,
  recuperarPassword,
  reenviarVerificacion,
  verificarCorreo,
} from "./tokens-cuenta.controller.js";

export const tokensCuentaRouter = Router();
const limitarCorreos = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Pediste varios enlaces. Esperá unos minutos antes de intentarlo de nuevo.",
  },
});
const limitarTokens = rateLimit({
  windowMs: 15 * 60_000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Volvé a intentar más tarde." },
});

tokensCuentaRouter.post("/forgot-password", limitarCorreos, recuperarPassword);
tokensCuentaRouter.post(
  "/resend-verification",
  limitarCorreos,
  reenviarVerificacion,
);
tokensCuentaRouter.post("/reset-password", limitarTokens, cambiarPassword);
tokensCuentaRouter.post("/verify-email", limitarTokens, verificarCorreo);
