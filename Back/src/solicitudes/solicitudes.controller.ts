import type { NextFunction, Request, Response } from "express";
import {
  cambiarSolicitud,
  obtenerBandeja,
  crearSolicitudCliente,
} from "./solicitudes.service.js";
import { HttpError } from "../errors/http-error.js";

export async function listar(req: Request, res: Response) {
  res.json(await obtenerBandeja(req.usuario!.id));
}

export async function actualizar(req: Request, res: Response) {
  res.json(
    await cambiarSolicitud(
      req.usuario!.id,
      req.params.id,
      req.body,
    ),
  );
}

// Función compartida para procesar la creación.
async function procesarCreacion(
  req: Request,
  res: Response,
  next: NextFunction,
  destino: {
    tipo: "ESTUDIO" | "ARTISTA";
    identificador: string;
  },
) {
  try {
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    const archivoZona = files?.imagenZonaMarcada?.[0];
    const archivoReferencia = files?.referencias?.[0];

    const nuevaSolicitud = await crearSolicitudCliente(
      req.usuario!.id,
      destino,
      req.body,
      archivoZona,
      archivoReferencia,
    );

    return res.status(201).json({
      success: true,
      message: "Solicitud creada con éxito",
      data: nuevaSolicitud,
    });
  } catch (error) {
    next(error);
  }
}

// Solicitud general dirigida a un estudio.
export async function crear(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const slug = req.params.slug;

  if (typeof slug !== "string" || !slug.trim()) {
    return next(
      new HttpError(400, "El identificador del estudio no es válido."),
    );
  }

  return procesarCreacion(req, res, next, {
    tipo: "ESTUDIO",
    identificador: slug,
  });
}

// Solicitud dirigida a un artista específico.
// Puede ser independiente o pertenecer a un estudio.
export async function crearParaArtista(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const artistaId = req.params.artistaId;

  if (typeof artistaId !== "string" || !artistaId.trim()) {
    return next(
      new HttpError(400, "El identificador del artista no es válido."),
    );
  }

  return procesarCreacion(req, res, next, {
    tipo: "ARTISTA",
    identificador: artistaId,
  });
}
