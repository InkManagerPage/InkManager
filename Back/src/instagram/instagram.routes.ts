import express, { Router, type Request } from "express";
import { verificarToken } from "../auth/auth.tokens.js";
import { origenesPermitidos } from "../config/auth.js";
import { coincide, firmaValida } from "../config/seguridad-integraciones.js";
import { HttpError } from "../errors/http-error.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import {
  desconectarInstagram,
  duracionInstagram,
  estadoInstagram,
  guardarInstagram,
  iniciarInstagram,
  validarEstadoInstagram,
} from "./instagram.conexion.js";
import {
  callbackInstagram,
  configWebhookInstagram,
  CuentaInstagramNoSeleccionada,
} from "./instagram.proveedor.js";
import {
  leerInstagram,
  recibirInstagram,
  responderInstagram,
  vincularInstagram,
  cambiarBotInstagram,
} from "./instagram.service.js";

export const webhookInstagram = Router();
webhookInstagram.get("/", (req, res) => {
  const config = configWebhookInstagram();
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
webhookInstagram.post(
  "/",
  express.raw({ type: "application/json", limit: "256kb" }),
  async (req, res) => {
    const config = configWebhookInstagram();
    if (
      !config ||
      !Buffer.isBuffer(req.body) ||
      !config.secretos.some((secreto) =>
        firmaValida(req.body, req.get("X-Hub-Signature-256") || "", secreto),
      )
    )
      throw new HttpError(403, "Firma no válida.");
    let evento;
    try {
      evento = JSON.parse(req.body.toString("utf8"));
    } catch {
      throw new HttpError(400, "Evento no válido.");
    }
    await recibirInstagram(evento);
    res.sendStatus(200);
  },
);

const cookie = "inkmanager_instagram_oauth";
const opcionesCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: callbackInstagram,
  secure: origenesPermitidos[0].startsWith("https://"),
};
const sesionDe = (req: Request) =>
  verificarToken(req.cookies.inkmanager_session).sesionId;

export const instagramRouter = Router();
instagramRouter.use(requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"));
instagramRouter.get("/conexion", async (req, res) => {
  res.json(await estadoInstagram(await resolverAmbito(req.usuario!.id)));
});
instagramRouter.get("/conectar", async (req, res) => {
  const { state, url } = await iniciarInstagram(
    await resolverAmbito(req.usuario!.id),
    sesionDe(req),
  );
  res.set("Referrer-Policy", "no-referrer");
  res.cookie(cookie, state, {
    ...opcionesCookie,
    maxAge: duracionInstagram * 1000,
  });
  res.redirect(302, url);
});
instagramRouter.get("/callback", async (req, res) => {
  res.set("Referrer-Policy", "no-referrer");
  res.clearCookie(cookie, opcionesCookie);
  const ruta =
    req.usuario!.rol === "ESTUDIO_ADMIN"
      ? "/estudio/configuracion#cuentas-asociadas"
      : "/artista/configuracion#cuentas-asociadas";
  const destino = new URL(ruta, origenesPermitidos[0]);
  try {
    const a = await resolverAmbito(req.usuario!.id);
    validarEstadoInstagram(
      a,
      sesionDe(req),
      req.cookies[cookie],
      req.query.state,
    );
    if (req.query.error !== undefined) {
      destino.searchParams.set(
        "instagram",
        req.query.error === "access_denied" ? "cancelado" : "error",
      );
    } else {
      await guardarInstagram(a, req.query.code);
      destino.searchParams.set("instagram", "conectado");
    }
  } catch (error) {
    if (!(error instanceof HttpError))
      console.error("No pudimos completar la conexión con Instagram.");
    let resultado = "error";
    if (error instanceof CuentaInstagramNoSeleccionada) resultado = error.resultado;
    else if (error instanceof HttpError && error.status === 409) resultado = "conflicto";
    destino.searchParams.set("instagram", resultado);
  }
  res.redirect(303, destino.href);
});
instagramRouter.delete("/conexion", async (req, res) => {
  await desconectarInstagram(await resolverAmbito(req.usuario!.id));
  res.sendStatus(204);
});
instagramRouter.post("/:id", async (req, res) => {
  await responderInstagram(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
instagramRouter.patch("/:id/lectura", async (req, res) => {
  await leerInstagram(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
instagramRouter.put("/:id/consulta", async (req, res) => {
  await vincularInstagram(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
instagramRouter.put("/:id/bot", async (req, res) => {
  await cambiarBotInstagram(req.usuario!.id, req.params.id, req.body);
  res.sendStatus(204);
});
