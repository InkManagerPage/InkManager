import jwt from "jsonwebtoken";
import { jwtSecret, duracionSesionSegundos } from "../config/auth.js";
import { HttpError } from "../errors/http-error.js";

export function crearToken(usuarioId: string, sesionId: string): string {
  return jwt.sign({}, jwtSecret, {
    subject: usuarioId,
    jwtid: sesionId,
    expiresIn: duracionSesionSegundos,
    algorithm: "HS256",
    issuer: "inkmanager-api",
    audience: "inkmanager-web",
  });
}

// Esta funcion verifica el token y devuelve el usuarioId si es válido, o lanza un error si no lo es.
export function verificarToken(token: string): {
  usuarioId: string;
  sesionId: string;
} {
  try {
    const contenido = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "inkmanager-api",
      audience: "inkmanager-web",
    });

    if (
      typeof contenido === "string" ||
      typeof contenido.sub !== "string" ||
      contenido.sub.length === 0 ||
      typeof contenido.jti !== "string" ||
      contenido.jti.length === 0
    ) {
      throw new Error("El token no contiene los identificadores.");
    }

    return {
      usuarioId: contenido.sub,
      sesionId: contenido.jti,
    };
  } catch {
    throw new HttpError(401, "Token inválido o vencido.");
  }
}
