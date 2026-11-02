import type { Request, Response } from "express";
import {
  invitarArtista,
  gestionarInvitacion,
  responderInvitacion,
} from "./invitaciones-equipo.service.js";
export async function crear(req: Request, res: Response) {
  res.status(201).json(await invitarArtista(req.usuario!.id, req.body));
}
export async function gestionar(req: Request, res: Response) {
  res.json(await gestionarInvitacion(req.usuario!.id, req.params.id, req.body));
}
export async function responder(req: Request, res: Response) {
  res.json(await responderInvitacion(req.usuario!.id, req.params.id, req.body));
}
