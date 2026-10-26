import type { Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import {
  prepararAccesoGoogle,
  duracionFlujoGoogleSegundos,
  iniciarSesionGoogle,
  validarFlujoGoogle,
} from "./google.service.js";
import { duracionSesionSegundos, origenesPermitidos } from "../config/auth.js";

export async function loginGoogle(_req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");

  const { url, flujoToken } = await prepararAccesoGoogle();

  guardarFlujoGoogle(res, flujoToken);
  res.redirect(302, url);
}

export async function registroGoogle(
  req: Request,
  res: Response,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  if (!req.is("application/json")) {
    throw new HttpError(415, "Enviá los datos del registro en formato JSON.");
  }

  const { url, flujoToken } = await prepararAccesoGoogle(req.body ?? null);
  guardarFlujoGoogle(res, flujoToken);
  res.json({ url });
}

function guardarFlujoGoogle(res: Response, flujoToken: string): void {
  res.cookie("inkmanager_google_oauth", flujoToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: duracionFlujoGoogleSegundos * 1000,
    path: "/api/auth/google",
  });
}

export async function callbackGoogle(
  req: Request,
  res: Response,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");

  const flujoToken = req.cookies?.inkmanager_google_oauth;

  res.clearCookie("inkmanager_google_oauth", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
  });

  const destino = new URL("/", origenesPermitidos[0]);
  try {
    if (req.query.error !== undefined) {
      validarFlujoGoogle(flujoToken, req.query.state);
      destino.searchParams.set(
        "google_error",
        req.query.error === "access_denied" ? "cancelado" : "fallido",
      );
    } else {
      const { token } = await iniciarSesionGoogle(
        req.query.code,
        flujoToken,
        req.query.state,
      );
      res.cookie("inkmanager_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: duracionSesionSegundos * 1000,
        path: "/",
      });
    }
  } catch (error) {
    if (!(error instanceof HttpError))
      console.error("No pudimos completar el acceso con Google.");
    destino.searchParams.set(
      "google_error",
      error instanceof HttpError && error.status === 409 ? "cuenta" : "fallido",
    );
  }
  res.redirect(303, destino.toString());
}
