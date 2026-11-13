import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { requerirPlanVigente } from "../middlewares/plan-vigente.js";
import { tienePlanIndividual } from "../pagos/acceso-plan.js";
import {
  obtenerEnlaceFormularioArtista,
  resolverAmbito,
} from "../solicitudes/solicitudes.service.js";
import { objetoEntrada } from "../solicitudes/solicitudes.validation.js";
import { leerConfiguracionAsistente } from "./asistente.repository.js";
import { validarConfiguracion } from "./configuracion.js";
import {
  generarRespuestaAsistente,
  pruebaAsistenteDisponible,
} from "./respuesta.js";

export const asistenteRouter = Router();
asistenteRouter.use(requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN"), requerirPlanVigente);

const limitarPruebas = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => req.usuario!.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Llegaste al límite de pruebas. Volvé a intentar en unos minutos.",
  },
});

async function ambitoConfiguracion(usuarioId: string) {
  const ambito = await resolverAmbito(usuarioId);
  if (!ambito.administra)
    throw new HttpError(
      403,
      "Solo el titular puede configurar el asistente del estudio.",
    );
  if (ambito.estudioId) return { estudioId: ambito.estudioId };
  if (!(await tienePlanIndividual(usuarioId)))
    throw new HttpError(
      403,
      "Necesitás un Plan Individual vigente para configurar el asistente.",
    );
  return { artistaId: usuarioId };
}

asistenteRouter.get("/configuracion", async (req, res) => {
  const where = await ambitoConfiguracion(req.usuario!.id);
  res.set("Cache-Control", "no-store").json({
    configuracion: await leerConfiguracionAsistente(where),
    pruebaDisponible: pruebaAsistenteDisponible(),
  });
});

asistenteRouter.put("/configuracion", async (req, res) => {
  const where = await ambitoConfiguracion(req.usuario!.id);
  const datos = validarConfiguracion(req.body);
  await prisma.configuracionAsistente.upsert({
    where,
    create: { ...where, datos },
    update: { datos },
    select: { id: true },
  });
  res.set("Cache-Control", "no-store").json({ configuracion: datos });
});

asistenteRouter.post("/prueba", limitarPruebas, async (req, res) => {
  const where = await ambitoConfiguracion(req.usuario!.id);
  const { mensaje } = objetoEntrada(req.body);
  if (typeof mensaje !== "string" || !mensaje.trim() || mensaje.length > 1000)
    throw new HttpError(400, "Escribí un mensaje de hasta 1000 caracteres.");
  const respuesta = await generarRespuestaAsistente(
    await leerConfiguracionAsistente(where),
    mensaje.trim(),
  );

  let enlaceFormulario: string | null = null;
  if (respuesta.accion === "FORMULARIO") {
    if (where.estudioId) {
      const estudio = await prisma.estudio.findUnique({
        where: { id: where.estudioId },
        select: { slug: true },
      });
      if (estudio)
        enlaceFormulario = "/cotizacion/" + encodeURIComponent(estudio.slug);
    } else if (where.artistaId) {
      enlaceFormulario = (await obtenerEnlaceFormularioArtista(where.artistaId))
        .enlace;
    }
  }
  res.set("Cache-Control", "no-store").json({ ...respuesta, enlaceFormulario });
});
