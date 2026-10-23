import { Router } from "express";
import { login, logout, me } from "./auth.controller.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { limitarLogin } from "../middlewares/limitar-login.js";
const router = Router();

router.post("/login", limitarLogin, login);
router.get("/me", requerirSesion, me);
router.post("/logout", logout);

export default router;
