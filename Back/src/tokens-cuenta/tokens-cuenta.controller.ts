import type { Request, Response } from "express";
import { registrarErrorCorreo } from "../correos/correos.errors.js";
import {
  confirmarEmail,
  mensajeSolicitudCorreo,
  restablecerPassword,
  solicitarEnlace,
  validarSolicitudCorreo,
} from "./tokens-cuenta.service.js";

export function recuperarPassword(req: Request, res: Response): void {
  solicitar(req, res, "PASSWORD");
}

export function reenviarVerificacion(req: Request, res: Response): void {
  solicitar(req, res, "VERIFICAR_EMAIL");
}

function solicitar(
  req: Request,
  res: Response,
  tipo: "PASSWORD" | "VERIFICAR_EMAIL",
): void {
  const email = validarSolicitudCorreo(req.body);
  // Respondemos igual antes de buscar la cuenta: ni el contenido ni el tiempo revelan si existe.
  res
    .set("Cache-Control", "no-store")
    .status(202)
    .json({ message: mensajeSolicitudCorreo });
  void solicitarEnlace(email, tipo).catch((error: unknown) => {
    registrarErrorCorreo("No se pudo procesar un enlace de cuenta.", error);
  });
}

export async function cambiarPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await restablecerPassword(req.body);
  res.clearCookie("inkmanager_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res
    .set("Cache-Control", "no-store")
    .json({ message: "Contraseña actualizada. Iniciá sesión nuevamente." });
}

export async function verificarCorreo(
  req: Request,
  res: Response,
): Promise<void> {
  await confirmarEmail(req.body);
  res
    .set("Cache-Control", "no-store")
    .json({ message: "Tu email ya está verificado." });
}
