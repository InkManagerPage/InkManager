import { Router } from "express";
import { instagramRouter } from "../instagram/instagram.routes.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import { mensajesRouter as whatsappRouter } from "../whatsapp/whatsapp.routes.js";
import { bandejaMensajes } from "./mensajes.service.js";

export const mensajesUnificadosRouter = Router();
mensajesUnificadosRouter.use("/instagram", instagramRouter);
mensajesUnificadosRouter.use("/whatsapp", whatsappRouter);
mensajesUnificadosRouter.get(
  "/",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  async (req, res) => {
    res.json(await bandejaMensajes(await resolverAmbito(req.usuario!.id)));
  },
);
mensajesUnificadosRouter.use("/", whatsappRouter);
