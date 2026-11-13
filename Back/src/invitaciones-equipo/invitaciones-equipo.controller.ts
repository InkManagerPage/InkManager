import type { Request, Response } from "express";
import {
  invitarArtista,
  gestionarInvitacion,
  responderInvitacion,
} from "./invitaciones-equipo.service.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import { listarInvitaciones } from "./invitaciones-equipo.repository.js";
import { presentarInvitacion } from "./invitaciones-equipo.entity.js";

export async function listarRecibidas(req: Request, res: Response) {
  const ambito = await resolverAmbito(req.usuario!.id);
  const invitaciones = ambito.estudioId ? [] : await listarInvitaciones(ambito);
  res.json({
    invitaciones: invitaciones.map((invitacion) => presentarInvitacion(invitacion)),
    emailVerificado: ambito.emailVerificado,
  });
}
export async function crear(req: Request, res: Response) {
  res.status(201).json(await invitarArtista(req.usuario!.id, req.body));
}
export async function gestionar(req: Request, res: Response) {
  res.json(await gestionarInvitacion(req.usuario!.id, req.params.id, req.body));
}
export async function responder(req: Request, res: Response) {
  res.json(await responderInvitacion(req.usuario!.id, req.params.id, req.body));
}
