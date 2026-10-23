import type { Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import { duracionSesionSegundos, origenesPermitidos } from "../config/auth.js";
import { iniciarSesion, cerrarSesion } from "./auth.service.js";
export async function login(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");

  try {
    const origen = req.get("Origin");

    if (origen && !origenesPermitidos.includes(origen)) {
      throw new HttpError(403, "Origen no permitido.");
    }

    if (!req.is("application/json")) {
      throw new HttpError(415, "El cuerpo debe enviarse como JSON.");
    }

    const { usuario, token } = await iniciarSesion(req.body);

    res.cookie("inkmanager_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: duracionSesionSegundos * 1000,
      path: "/",
    });

    res.status(200).json({
      message: "Sesión iniciada.",
      user: usuario,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Error al iniciar sesión.");
    res.status(500).json({ error: "No pudimos iniciar sesión." });
  }
}

// Esta función obtiene los datos del usuario actualmente autenticado a partir de la cookie de sesión.
// No se almacena información sensible en la cookie, solo un token que permite identificar al usuario.
export function me(req: Request, res: Response): void {
  if (!req.usuario) {
    res.status(401).json({ error: "Debés iniciar sesión." });
    return;
  }

  res.status(200).json({ user: req.usuario });
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");

  try {
    const origen = req.get("Origin");

    if (origen && !origenesPermitidos.includes(origen)) {
      throw new HttpError(403, "Origen no permitido.");
    }

    await cerrarSesion(req.cookies?.inkmanager_session);

    res.clearCookie("inkmanager_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({ message: "Sesión cerrada." });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Error al cerrar sesión.");
    res.status(500).json({ error: "No pudimos cerrar sesión." });
  }
}
