import { Router } from "express";
import { login, logout, me } from "./auth.controller.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { limitarLogin } from "../middlewares/limitar-login.js";
import { loginGoogle, registroGoogle } from "./google.controller.js";
const router = Router();

router.post("/login", limitarLogin, login);
router.get("/me", requerirSesion, me);
router.post("/logout", logout);
router.get("/google", loginGoogle);
router.post("/google/registro", registroGoogle);

export default router;
