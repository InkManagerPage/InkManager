import type { Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import {
  prepararAccesoGoogle,
  duracionFlujoGoogleSegundos,
} from "./google.service.js";

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
