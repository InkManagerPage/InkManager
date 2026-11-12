import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/http-error.js";
import { obtenerUsuarioSesion } from "../auth/auth.service.js";
import {
  cancelarSuscripcion,
  crearSuscripcion,
  obtenerEstadoSuscripcion,
  obtenerSuscripcionActual,
  procesarWebhookMercadoPago,
  validarFirmaWebhook,
} from "./pagos.service.js";
import { obtenerPlanes } from "./planes.js";
import { obtenerSecretoWebhookMercadoPago } from "../config/mercadopago.js";

export async function iniciarPago(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  try {
    if (!req.usuario) throw new HttpError(401, "Debés iniciar sesión.");
    const resultado = await crearSuscripcion(req.usuario, req.body);
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function listarPlanes(_req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "no-store");
  res.status(200).json({ plans: obtenerPlanes() });
}

export async function consultarPago(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  try {
    if (!req.usuario) throw new HttpError(401, "Debés iniciar sesión.");
    const id = req.params.id;
    if (typeof id !== "string" || !/^[\da-f-]{36}$/i.test(id)) {
      throw new HttpError(400, "El identificador de suscripción no es válido.");
    }
    res.status(200).json(
      await obtenerEstadoSuscripcion(id, req.usuario.id, req.method === "POST"),
    );
  } catch (error) {
    next(error);
  }
}

export async function cancelarPago(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  try {
    const entrada =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body.token
        : undefined;
    if (entrada !== undefined && typeof entrada !== "string") {
      throw new HttpError(400, "El enlace de cancelación no es válido.");
    }
    const usuario = entrada === undefined ? await obtenerUsuarioSesion(req.cookies?.inkmanager_session) : null;
    const resultado = await cancelarSuscripcion(usuario?.id, entrada);
    res.status(200).json({
      message: "La suscripción fue cancelada.",
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelarPagoInmediatamente(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  try {
    if (!req.usuario) throw new HttpError(401, "Debés iniciar sesión.");
    if (req.body && Object.keys(req.body).length > 0) {
      throw new HttpError(400, "La solicitud de cancelación no es válida.");
    }
    const resultado = await cancelarSuscripcion(
      req.usuario.id,
      undefined,
      undefined,
      true,
    );
    res.status(200).json({
      message: "La suscripción fue cancelada y el acceso quedó desactivado.",
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}

export async function consultarSuscripcion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.set("Cache-Control", "no-store");
  try {
    if (!req.usuario) throw new HttpError(401, "Debés iniciar sesión.");
    res.status(200).json(await obtenerSuscripcionActual(req.usuario.id));
  } catch (error) {
    next(error);
  }
}

function dataIdWebhook(req: Request): string | null {
  const queryId = req.query["data.id"] ?? req.query.id;
  if (typeof queryId === "string" && queryId.length > 0) return queryId;
  const data = req.body?.data;
  if (!data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>).id;
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  return null;
}

export async function recibirWebhookMercadoPago(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dataId = dataIdWebhook(req);
    const requestId = req.get("x-request-id");
    const firma = req.get("x-signature");
    if (
      !validarFirmaWebhook(
        firma,
        requestId,
        dataId,
        obtenerSecretoWebhookMercadoPago(),
      )
    ) {
      throw new HttpError(401, "La firma de la notificación no es válida.");
    }

    const tipoBody = req.body?.type;
    const tipoQuery = req.query.type ?? req.query.topic;
    const tipo =
      typeof tipoBody === "string"
        ? tipoBody
        : typeof tipoQuery === "string"
          ? tipoQuery
          : "";

    if (
      dataId &&
      (tipo === "subscription_preapproval" ||
        tipo === "subscription_authorized_payment" ||
        tipo === "payment" ||
        tipo === "payment.updated")
    ) {
      await procesarWebhookMercadoPago(tipo, dataId);
    }
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
}

export function obtenerPlanesDisponibles(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.set("Cache-Control", "public, max-age=3600");
  try {
    const planes = [
      {
        id: "INDIVIDUAL",
        nombre: "Individual",
        mensual: 12000,
        anual: 120000,
        moneda: "ARS" as const,
      },
      {
        id: "ESTUDIO",
        nombre: "Estudio",
        mensual: 35000,
        anual: 350000,
        moneda: "ARS" as const,
      },
    ];
    res.status(200).json({ plans: planes });
  } catch (error) {
    next(error);
  }
}
