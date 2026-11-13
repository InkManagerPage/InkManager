import type { Request, Response } from "express";
import {
  cambiarSolicitud,
  crearSolicitudCliente,
  crearSolicitudEstudio,
  crearSolicitudCercanos,
  obtenerBandeja,
  obtenerEstudioPublico,
  obtenerArtistaPublico,
  obtenerEnlaceFormularioArtista,
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

export async function mostrarArtista(req: Request, res: Response) {
  const artista = await obtenerArtistaPublico(req.params.id);
  res.set("Cache-Control", "no-store").json({
    nombre: artista.nombreArtistico || "Artista",
    estudio: artista.estudio?.nombre ?? null,
    estudioSlug: artista.estudio?.slug ?? null,
  });
}

export async function mostrarEnlaceArtista(req: Request, res: Response) {
  res.set("Cache-Control", "no-store").json(await obtenerEnlaceFormularioArtista(req.usuario!.id));
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

export async function crearParaCercanos(req: Request, res: Response) {
  const resultado = await crearSolicitudCercanos(req.body, archivos(req));
  res.status(201).json(resultado);
}
