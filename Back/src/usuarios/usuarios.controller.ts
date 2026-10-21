import type { Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import {
  registrarArtista,
  registrarUsuario,
  verificarEmail,
} from "./usuarios.service.js";

export async function registerArtist(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const artista = await registrarArtista(req.body ?? {});
    res
      .status(201)
      .json({ message: "Artista registrado con éxito.", user: artista });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("Error al registrar artista.");
    res
      .status(500)
      .json({ error: "Ocurrió un error al procesar el registro del artista." });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    await verificarEmail(req.query.token);
    res
      .status(200)
      .json({ message: "Correo electrónico verificado exitosamente." });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("Error al verificar email.");
    res.status(500).json({ error: "Error interno al verificar el correo." });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const usuario = await registrarUsuario(req.body);

    res.status(201).json({
      message: "Usuario registrado con éxito.",
      user: usuario,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: error.message,
      });
      return;
    }

    console.error("Error al registrar usuario.");

    res.status(500).json({
      error: "Ocurrió un error al procesar el registro.",
    });
  }
}
