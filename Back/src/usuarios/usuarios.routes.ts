import { Router } from "express";
import {
  register,
  registerArtist,
  verifyEmail,
} from "./usuarios.controller.js";

const router = Router();

router.post("/register", register);
router.post("/register-artist", registerArtist);
router.get("/verify-email", verifyEmail);

export default router;
