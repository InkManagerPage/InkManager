import { Router } from "express";
import { DateTime } from "luxon";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { requerirSesion } from "../middlewares/autenticacion.js";
import { requerirRoles } from "../middlewares/roles.js";
import { cancelarSuscripcion } from "../pagos/pagos.service.js";
import {
  objetoEntrada,
  validarIdConsulta,
} from "../solicitudes/solicitudes.validation.js";
import {
  cambiarEstadoCuenta,
  listarAcciones,
  listarCuentas,
  listarSuscripciones,
  otorgarPlanBonificado,
  resumenAdministrativo,
  revocarPlanBonificado,
} from "./administracion.repository.js";

const zona = "America/Argentina/Buenos_Aires";
export const administracionRouter = Router();
administracionRouter.use(requerirSesion, requerirRoles("SUPERADMIN"));

function fecha(valor: unknown, defecto: DateTime) {
  if (valor === undefined) return defecto;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
    throw new HttpError(400, "Indicá una fecha válida.");
  const d = DateTime.fromISO(valor, { zone: zona });
  if (!d.isValid) throw new HttpError(400, "Indicá una fecha válida.");
  return d.startOf("day");
}
function parametros(q: unknown, pagina: unknown) {
  const p = Number(pagina ?? 1);
  if (!Number.isInteger(p) || p < 1 || p > 1000)
    throw new HttpError(400, "Página no válida.");
  return { q: typeof q === "string" ? q.trim().slice(0, 254) : "", pagina: p };
}
function motivo(valor: unknown) {
  if (
    typeof valor !== "string" ||
    valor.trim().length < 5 ||
    valor.trim().length > 240
  )
    throw new HttpError(400, "Indicá un motivo de 5 a 240 caracteres.");
  return valor.trim();
}

administracionRouter.get("/resumen", async (req, res) => {
  const hoy = DateTime.now().setZone(zona).startOf("day");
  const desde = fecha(req.query.desde, hoy.startOf("month"));
  const hasta = fecha(req.query.hasta, hoy);
  if (desde > hasta || hasta.diff(desde, "days").days > 366)
    throw new HttpError(400, "Elegí un período de hasta un año.");
  res.json(
    await resumenAdministrativo(
      desde.toJSDate(),
      hasta.plus({ days: 1 }).toJSDate(),
    ),
  );
});
administracionRouter.get("/cuentas", async (req, res) => {
  const { q, pagina } = parametros(req.query.q, req.query.pagina);
  const filas = await listarCuentas(q, pagina);
  res.json({ filas: filas.slice(0, 25), siguiente: filas.length > 25 });
});
administracionRouter.patch("/cuentas/:id", async (req, res) => {
  const body = objetoEntrada(req.body);
  if (typeof body.suspendida !== "boolean")
    throw new HttpError(400, "Elegí un estado válido.");
  await cambiarEstadoCuenta(
    req.usuario!.id,
    validarIdConsulta(req.params.id),
    body.suspendida,
    motivo(body.motivo),
  );
  res.sendStatus(204);
});
administracionRouter.get("/suscripciones", async (req, res) => {
  const { q, pagina } = parametros(req.query.q, req.query.pagina);
  const filas = await listarSuscripciones(q, pagina);
  res.json({ filas: filas.slice(0, 25), siguiente: filas.length > 25 });
});
administracionRouter.post("/cuentas/:id/plan-bonificado", async (req, res) => {
  const body = objetoEntrada(req.body);
  const dias = body.dias;
  if (dias !== null && (typeof dias !== "number" || !Number.isInteger(dias) || dias < 1 || dias > 730))
    throw new HttpError(400, "Indicá entre 1 y 730 días de vigencia o elegí sin vencimiento.");
  const hasta = typeof dias === "number" ? DateTime.now().setZone(zona).plus({ days: dias }).toJSDate() : null;
  res.status(200).json(await otorgarPlanBonificado(req.usuario!.id, validarIdConsulta(req.params.id), hasta, motivo(body.motivo)));
});
administracionRouter.post("/suscripciones/:id/revocar-bonificacion", async (req, res) => {
  await revocarPlanBonificado(req.usuario!.id, validarIdConsulta(req.params.id), motivo(objetoEntrada(req.body).motivo));
  res.sendStatus(204);
});
administracionRouter.post("/suscripciones/:id/cancelar", async (req, res) => {
  const id = validarIdConsulta(req.params.id);
  const razon = motivo(objetoEntrada(req.body).motivo);
  const s = await prisma.suscripcion.findUnique({
    where: { id },
    select: { usuarioId: true, estado: true, bonificada: true },
  });
  if (!s || s.bonificada || !["PENDIENTE", "ACTIVA", "PAUSADA"].includes(s.estado))
    throw new HttpError(409, "La suscripción ya no admite una cancelación.");
  const registro = await prisma.accionAdministrativa.create({
    data: {
      autorId: req.usuario!.id,
      cuentaId: s.usuarioId,
      accion: "CANCELACION_SOLICITADA",
      motivo: razon,
    },
  });
  await cancelarSuscripcion(s.usuarioId, undefined, id);
  await prisma.accionAdministrativa.update({
    where: { id: registro.id },
    data: { accion: "CANCELAR_SUSCRIPCION" },
  });
  res.sendStatus(204);
});
administracionRouter.get("/historial", async (_req, res) => {
  res.json(await listarAcciones());
});
