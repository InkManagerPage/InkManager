import type { Request, Response } from "express";
import { guardarBloqueo, quitarBloqueo } from "./bloqueos-agenda.service.js";
export async function crear(req: Request, res: Response) {
  res
    .status(201)
    .json(
      await guardarBloqueo(req.usuario!.id, req.params.artistaId, req.body),
    );
}
export async function editar(req: Request, res: Response) {
  res.json(
    await guardarBloqueo(
      req.usuario!.id,
      req.params.artistaId,
      req.body,
      req.params.bloqueoId,
    ),
  );
}
export async function quitar(req: Request, res: Response) {
  res.json(
    await quitarBloqueo(
      req.usuario!.id,
      req.params.artistaId,
      req.params.bloqueoId,
      req.body,
    ),
  );
}
