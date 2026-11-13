import { Router } from "express";
import { instagramRouter } from "../instagram/instagram.routes.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import { mensajesRouter as whatsappRouter } from "../whatsapp/whatsapp.routes.js";
import { bandejaMensajes, historialMensajes } from "./mensajes.service.js";
import { HttpError } from "../errors/http-error.js";
import { validarIdConsulta } from "../solicitudes/solicitudes.validation.js";

export const mensajesUnificadosRouter = Router();
mensajesUnificadosRouter.get(
  "/:canal/:id/historial",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  requerirPlanVigente,
  async (req, res) => {
    const { canal, id } = req.params;
    if (canal !== "instagram" && canal !== "whatsapp")
      throw new HttpError(404, "No encontramos el canal.");
    res.set("Cache-Control", "no-store").json(await historialMensajes(
      await resolverAmbito(req.usuario!.id), canal, validarIdConsulta(id), validarIdConsulta(req.query.antes),
    ));
  },
);
mensajesUnificadosRouter.use("/instagram", instagramRouter);
mensajesUnificadosRouter.use("/whatsapp", whatsappRouter);
mensajesUnificadosRouter.get(
  "/",
  requerirSesion,
  requerirRoles("ARTISTA", "ESTUDIO_ADMIN"),
  requerirPlanVigente,
  async (req, res) => {
    const consulta = req.query.consulta === undefined ? undefined : validarIdConsulta(req.query.consulta);
    res.set("Cache-Control", "no-store").json(await bandejaMensajes(await resolverAmbito(req.usuario!.id), consulta));
  },
);
mensajesUnificadosRouter.use("/", whatsappRouter);
