import type { Request, Response } from "express";
import {
  cambiarSolicitud,
  crearSolicitudCliente,
  crearSolicitudEstudio,
  obtenerBandeja,
  obtenerEstudioPublico,
} from "./solicitudes.service.js";

export async function listar(req: Request, res: Response) {
  res.json(await obtenerBandeja(req.usuario!.id));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await cambiarSolicitud(req.usuario!.id, req.params.id, req.body));
}

export async function mostrarEstudio(req: Request, res: Response) {
  const estudio = await obtenerEstudioPublico(req.params.slug);
  res.set("Cache-Control", "no-store").json({ nombre: estudio.nombre });
}

function archivos(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return { zona: files?.imagenZonaMarcada?.[0], referencia: files?.referencias?.[0] };
}

export async function crear(req: Request, res: Response) {
  await crearSolicitudEstudio(req.params.slug, req.body, archivos(req));
  res.status(201).json({ success: true });
}

export async function crearParaArtista(req: Request, res: Response) {
  await crearSolicitudCliente(req.params.id, req.body, archivos(req));
  res.status(201).json({ success: true });
}
