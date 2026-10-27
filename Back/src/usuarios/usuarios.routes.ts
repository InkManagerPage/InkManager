import { Router } from "express";
import {
  register,
  registerArtist,
  verifyEmail,
  filtrarArtistas
} from "./usuarios.controller.js";

const router = Router();

router.post("/register", register);
router.post("/register-artist", registerArtist);
router.get("/verify-email", verifyEmail);
router.get("/filter-artists", filtrarArtistas);

export default router;
