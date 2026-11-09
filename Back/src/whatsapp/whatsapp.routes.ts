import express, { Router } from "express";
import { HttpError } from "../errors/http-error.js";
import { verificarToken } from "../auth/auth.tokens.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import {
  activarConexion,
  desconectarConexion,
  estadoConexion,
  guardarConexion,
} from "./whatsapp.conexion.js";
import {
  coincide,
  configuracionWebhook,
  firmaValida,
} from "./whatsapp.proveedor.js";
import {
  bandejaWhatsApp,
  marcarConversacion,
  recibirWhatsApp,
  responderWhatsApp,
  vincularConsulta,
} from "./whatsapp.service.js";

export const webhookWhatsApp = Router();
webhookWhatsApp.get("/", (req, res) => {
  const config = configuracionWebhook();
  const token = req.query["hub.verify_token"];
  const reto = req.query["hub.challenge"];
  if (
    !config ||
    req.query["hub.mode"] !== "subscribe" ||
    typeof token !== "string" ||
    typeof reto !== "string" ||
    !coincide(token, config.verificacion)
  )
    throw new HttpError(403, "Verificación no válida.");
  res.type("text/plain").send(reto);
});
webhookWhatsApp.post(
  "/",
  express.raw({ type: "application/json", limit: "256kb" }),
  async (req, res) => {
    const config = configuracionWebhook();
    if (
      !config ||
      !Buffer.isBuffer(req.body) ||
      !firmaValida(
        req.body,
        req.get("X-Hub-Signature-256") || "",
        config.secreto,
      )
    )
      throw new HttpError(403, "Firma no válida.");
    let evento;
    try {
      evento = JSON.parse(req.body.toString("utf8"));
    } catch {
      throw new HttpError(400, "Evento no válido.");
    }
    await recibirWhatsApp(evento);
    res.sendStatus(200);
  },
);

export const mensajesRouter = Router();
mensajesRouter.use(requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"));

const conexion = Router();
conexion.use(requerirRoles("ESTUDIO_ADMIN"));
async function estudioDe(usuarioId: string) {
  const a = await resolverAmbito(usuarioId);
  if (!a.administra || !a.estudioId)
    throw new HttpError(403, "Solo el titular puede conectar WhatsApp.");
  return a.estudioId;
}
conexion.get("/", async (req, res) => {
  const estudioId = await estudioDe(req.usuario!.id);
  res.json(
    await estadoConexion(
      estudioId,
      verificarToken(req.cookies.inkmanager_session).sesionId,
    ),
  );
});
conexion.post("/", async (req, res) => {
  const estudioId = await estudioDe(req.usuario!.id);
  res
    .status(201)
    .json(
      await guardarConexion(
        estudioId,
        verificarToken(req.cookies.inkmanager_session).sesionId,
        req.body,
      ),
    );
});
conexion.post("/activar", async (req, res) => {
  await activarConexion(await estudioDe(req.usuario!.id), req.body);
  res.sendStatus(204);
});
conexion.delete("/", async (req, res) => {
  await desconectarConexion(await estudioDe(req.usuario!.id));
  res.sendStatus(204);
});
mensajesRouter.use("/conexion", conexion);

mensajesRouter.get("/", async (req, res) => {
  res.json(await bandejaWhatsApp(req.usuario!.id));
});
mensajesRouter.post("/:id", async (req, res) => {
  await responderWhatsApp(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
mensajesRouter.patch("/:id/lectura", async (req, res) => {
  await marcarConversacion(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
mensajesRouter.put("/:id/consulta", async (req, res) => {
  await vincularConsulta(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
