import jwt from "jsonwebtoken";
import { jwtSecret, duracionSesionSegundos } from "../config/auth.js";

export function crearToken(usuarioId: string): string {
  return jwt.sign({}, jwtSecret, {
    subject: usuarioId,
    expiresIn: duracionSesionSegundos,
    algorithm: "HS256",
    issuer: "inkmanager-api",
    audience: "inkmanager-web",
  });
}
