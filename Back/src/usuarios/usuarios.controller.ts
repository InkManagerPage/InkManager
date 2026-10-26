import type { Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import {
  registrarArtista,
  registrarUsuario,
  obtenerArtistasFiltrados
} from "./usuarios.service.js";
import { origenesPermitidos } from "../config/auth.js";

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
    if (typeof req.query.token !== "string" || !/^[a-f0-9]{64}$/.test(req.query.token)) {
      throw new HttpError(400, "El enlace de verificación no es válido.");
    }
    // Los lectores automáticos de correo pueden abrir enlaces: confirmar requiere un POST.
    const destino = new URL("/verificar-email", origenesPermitidos[0]);
    destino.hash = req.query.token;
    res.set("Cache-Control", "no-store").set("Referrer-Policy", "no-referrer").redirect(303, destino.toString());
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

export async function filtrarArtistas (req: Request, res: Response): Promise<void>{
  try {
    const artistasFiltrados = await obtenerArtistasFiltrados(req.query);

    res.status(200).json({
      message: 'Estos artistas cumplen con tus filtros',
      artistas: artistasFiltrados
    })
  }catch(error){
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: error.message,
      });
      return;
    }

    console.error("Error al fitlrar artistas.");

    res.status(500).json({
      error: "Ocurrió un error al procesar los filtros",
    });
  }
}
