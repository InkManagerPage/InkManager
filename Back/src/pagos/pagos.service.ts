import {
  CicloSuscripcion,
  EstadoPagoSuscripcion,
  EstadoSuscripcion,
  PlanSuscripcion,
  Prisma,
} from "@prisma/client";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "../config/prisma.js";
import {
  ErrorMercadoPago,
  obtenerAccessTokenMercadoPago,
  obtenerSecretoWebhookMercadoPago,
  obtenerUrlWebhookMercadoPago,
  solicitarMercadoPago,
  urlFrontend,
} from "../config/mercadopago.js";
import { HttpError } from "../errors/http-error.js";
import { enviarCorreo } from "../correos/correos.service.js";
import { correoCuenta } from "../correos/correos.templates.js";
import type { UsuarioSesion } from "../usuarios/usuarios.entity.js";
import { obtenerPrecio, validarPlanYCiclo } from "./planes.js";

type SuscripcionMercadoPago = {
  id?: unknown;
  status?: unknown;
  init_point?: unknown;
  external_reference?: unknown;
  next_payment_date?: unknown;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

type PagoAutorizadoMercadoPago = {
  id?: unknown;
  preapproval_id?: unknown;
  external_reference?: unknown;
  transaction_amount?: unknown;
  currency_id?: unknown;
  debit_date?: unknown;
  date_created?: unknown;
  status?: unknown;
  summarized?: unknown;
  payment?: {
    id?: unknown;
    status?: unknown;
    transaction_amount?: unknown;
    currency_id?: unknown;
    date_created?: unknown;
  };
};

const nombresPlanes: Record<PlanSuscripcion, string> = {
  INDIVIDUAL: "Individual",
  ESTUDIO: "Estudio",
};

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function fechaValida(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function fechaLegible(fecha: Date | null): string {
  if (!fecha) return "la próxima fecha de cobro";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
}

function nombreCiclo(ciclo: CicloSuscripcion): string {
  return ciclo === "ANUAL" ? "anual" : "mensual";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseId(valor: unknown): string | null {
  if (typeof valor === "string" && valor.length > 0) return valor;
  if (typeof valor === "number" && Number.isSafeInteger(valor)) {
    return String(valor);
  }
  return null;
}

function parseMonto(valor: unknown): number | null {
  const monto =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number(valor)
        : Number.NaN;
  return Number.isFinite(monto) && monto >= 0 ? monto : null;
}

function urlCheckout(valor: unknown): string {
  if (typeof valor !== "string") {
    throw new HttpError(502, "Mercado Pago no devolvió el enlace de pago.");
  }
  try {
    const url = new URL(valor);
    const dominioPermitido =
      url.hostname === "mercadopago.com.ar" ||
      url.hostname.endsWith(".mercadopago.com.ar") ||
      url.hostname === "mercadopago.com" ||
      url.hostname.endsWith(".mercadopago.com");
    if (url.protocol !== "https:" || !dominioPermitido) {
      throw new Error("URL externa no permitida");
    }
    return url.toString();
  } catch {
    throw new HttpError(
      502,
      "Mercado Pago devolvió un enlace de pago inválido.",
    );
  }
}

export async function crearSuscripcion(
  usuario: UsuarioSesion,
  entrada: unknown,
): Promise<{ checkoutUrl: string } | { paymentProcessing: true }> {
  const { plan, ciclo } = validarPlanYCiclo(entrada);
  if (!esObjeto(entrada)) {
    throw new HttpError(400, "Los datos del pago no son válidos.");
  }
  const datosEntrada = entrada;
  const camposDeTarjeta = [
    "card_number",
    "cardNumber",
    "security_code",
    "securityCode",
    "expiration_date",
    "expirationDate",
  ];
  if (camposDeTarjeta.some((campo) => campo in datosEntrada)) {
    throw new HttpError(
      400,
      "No envíes datos de tarjeta. Usá el formulario seguro de Mercado Pago.",
    );
  }
  const cardTokenId = datosEntrada.card_token_id;
  if (
    cardTokenId !== undefined &&
    (typeof cardTokenId !== "string" ||
      cardTokenId.length < 8 ||
      cardTokenId.length > 512 ||
      cardTokenId.trim() !== cardTokenId)
  ) {
    throw new HttpError(400, "El token de tarjeta no es válido.");
  }
  if (
    (plan === "INDIVIDUAL" &&
      (usuario.rol !== "ARTISTA" || usuario.estudioId)) ||
    (plan === "ESTUDIO" && usuario.rol !== "ESTUDIO_ADMIN")
  ) {
    throw new HttpError(
      403,
      "El plan elegido no corresponde al tipo de cuenta.",
    );
  }
  if (process.env.NODE_ENV === "production" && process.env.MERCADOPAGO_COBROS_ACTIVOS !== "1") {
    throw new HttpError(503, "La contratación de suscripciones todavía no está disponible.");
  }

  const ahora = new Date();
  const existente = await prisma.suscripcion.findFirst({
    where: {
      usuarioId: usuario.id,
      OR: [
        { estado: EstadoSuscripcion.ACTIVA },
        {
          estado: EstadoSuscripcion.CANCELADA,
          periodoHasta: { gt: ahora },
        },
      ],
    },
    select: { id: true },
  });
  if (existente) {
    throw new HttpError(
      409,
      "Ya tenés una suscripción activa o un período abonado.",
    );
  }

  const intentosPendientes = await prisma.suscripcion.findMany({
    where: {
      usuarioId: usuario.id,
      estado: EstadoSuscripcion.PENDIENTE,
    },
    select: { id: true, mercadoPagoId: true, plan: true, ciclo: true },
  });

  obtenerAccessTokenMercadoPago();
  obtenerSecretoWebhookMercadoPago();
  const notificationUrl = obtenerUrlWebhookMercadoPago();
  const backUrl = urlFrontend("/suscripcion/resultado");

  for (const intento of intentosPendientes) {
    if (!intento.mercadoPagoId) {
      throw new HttpError(
        409,
        "Todavía estamos verificando el intento anterior. Revisá el estado de tu suscripción antes de volver a pagar.",
      );
    }
    const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
      `/preapproval/${encodeURIComponent(intento.mercadoPagoId)}`,
    );
    const estadoRemoto = typeof remota.status === "string" ? remota.status.toLowerCase() : "";
    if (estadoRemoto === "authorized") {
      throw new HttpError(409, "Mercado Pago todavía está procesando la suscripción anterior.");
    }
    if (estadoRemoto === "pending") {
      if (!cardTokenId && intento.plan === plan && intento.ciclo === ciclo && remota.init_point)
        return { checkoutUrl: urlCheckout(remota.init_point) };
      throw new HttpError(409, "Revisá o cancelá el intento pendiente desde Suscripción antes de iniciar otro.");
    }
    if (estadoRemoto === "paused") {
      throw new HttpError(409, "Cancelá la suscripción anterior desde Suscripción antes de iniciar otro intento.");
    }
    if (!["cancelled", "canceled", "rejected"].includes(estadoRemoto)) {
      throw new HttpError(502, "Mercado Pago no confirmó el estado del intento anterior.");
    }

    await prisma.suscripcion.updateMany({
      where: {
        id: intento.id,
        estado: EstadoSuscripcion.PENDIENTE,
      },
      data: { estado: EstadoSuscripcion.ERROR },
    });
  }

  const id = randomUUID();
  const monto = obtenerPrecio(plan, ciclo);
  let suscripcion: Awaited<ReturnType<typeof prisma.suscripcion.create>>;
  try {
    suscripcion = await prisma.suscripcion.create({
      data: {
        id,
        usuarioId: usuario.id,
        plan,
        ciclo,
        monto,
        moneda: "ARS",
        referenciaExterna: id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "Ya hay un intento de pago en curso. Actualizá la página e intentá nuevamente.",
      );
    }
    throw error;
  }

  try {
    const respuesta = await solicitarMercadoPago<SuscripcionMercadoPago>(
      "/preapproval",
      {
        method: "POST",
        idempotencyKey: suscripcion.id,
        body: {
          reason: `InkManager - Plan ${nombresPlanes[plan]} (${nombreCiclo(ciclo)})`,
          external_reference: suscripcion.referenciaExterna,
          payer_email: usuario.email,
          auto_recurring: {
            frequency: ciclo === "ANUAL" ? 12 : 1,
            frequency_type: "months",
            transaction_amount: monto,
            currency_id: "ARS",
          },
          back_url: backUrl,
          notification_url: notificationUrl,
          status: typeof cardTokenId === "string" ? "authorized" : "pending",
          ...(typeof cardTokenId === "string"
            ? { card_token_id: cardTokenId }
            : {}),
        },
      },
    );
    const mercadoPagoId = parseId(respuesta.id);
    if (!mercadoPagoId) {
      throw new HttpError(
        502,
        "Mercado Pago no devolvió una identificación de suscripción válida.",
      );
    }
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        mercadoPagoId,
        proximoCobroAt: fechaValida(
          (respuesta as SuscripcionMercadoPago).next_payment_date,
        ),
      },
    });
    if (typeof cardTokenId === "string") {
      return { paymentProcessing: true };
    }
    const checkoutUrl = urlCheckout(respuesta.init_point);
    return { checkoutUrl };
  } catch (error) {
    if (error instanceof ErrorMercadoPago && [400, 401, 403, 404, 422].includes(error.estadoProveedor)) {
      await prisma.suscripcion.updateMany({
        where: { id: suscripcion.id, estado: EstadoSuscripcion.PENDIENTE, mercadoPagoId: null },
        data: { estado: EstadoSuscripcion.ERROR },
      });
    }
    throw error;
  }
}

async function notificarCancelacion(suscripcionId: string): Promise<void> {
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: suscripcionId },
    include: { usuario: { select: { email: true, nombre: true } } },
  });
  if (!suscripcion || suscripcion.correoCancelacionEnviadoAt) return;

  await enviarCorreo(
    correoCuenta({
      para: suscripcion.usuario.email,
      nombre: suscripcion.usuario.nombre,
      asunto: "Tu suscripción de InkManager fue cancelada",
      mensaje: `Cancelamos tu plan ${nombresPlanes[suscripcion.plan]}. No se realizarán nuevos cobros. Podés usar el servicio hasta ${fechaLegible(suscripcion.periodoHasta)}.`,
      clave: `suscripcion-cancelada:${suscripcion.id}`,
    }),
  );
  await prisma.suscripcion.updateMany({
    where: {
      id: suscripcion.id,
      correoCancelacionEnviadoAt: null,
    },
    data: { correoCancelacionEnviadoAt: new Date() },
  });
}

export async function cancelarSuscripcion(
  usuarioId: string | undefined,
  tokenEntrada: unknown,
  suscripcionId?: string,
): Promise<{ estado: EstadoSuscripcion; periodoHasta: Date | null }> {
  let suscripcion: {
    id: string;
    estado: EstadoSuscripcion;
    mercadoPagoId: string | null;
    periodoHasta: Date | null;
    correoCancelacionEnviadoAt: Date | null;
  } | null = null;
  let tokenId: string | undefined;

  if (typeof tokenEntrada === "string" && tokenEntrada.length >= 32) {
    const token = await prisma.tokenCancelacion.findUnique({
      where: { tokenHash: hashToken(tokenEntrada) },
      include: {
        suscripcion: {
          select: {
            id: true,
            estado: true,
            mercadoPagoId: true,
            periodoHasta: true,
            correoCancelacionEnviadoAt: true,
          },
        },
      },
    });
    if (!token)
      throw new HttpError(404, "El enlace de cancelación no es válido.");
    if (
      token.expiraAt <= new Date() &&
      token.suscripcion.estado !== "CANCELADA"
    ) {
      throw new HttpError(410, "El enlace de cancelación ya venció.");
    }
    if (token.usadoAt && token.suscripcion.estado !== "CANCELADA") {
      throw new HttpError(410, "El enlace de cancelación ya fue utilizado.");
    }
    tokenId = token.id;
    suscripcion = token.suscripcion;
  } else if (usuarioId) {
    suscripcion = await prisma.suscripcion.findFirst({
      where: {
        usuarioId,
        ...(suscripcionId ? { id: suscripcionId } : {}),
        estado: {
          in: [
            EstadoSuscripcion.PENDIENTE,
            EstadoSuscripcion.ACTIVA,
            EstadoSuscripcion.CANCELADA,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        estado: true,
        mercadoPagoId: true,
        periodoHasta: true,
        correoCancelacionEnviadoAt: true,
      },
    });
  } else {
    throw new HttpError(401, "Iniciá sesión o usá el enlace de cancelación.");
  }

  if (!suscripcion) {
    throw new HttpError(404, "No encontramos una suscripción para cancelar.");
  }
  if (suscripcion.estado !== EstadoSuscripcion.CANCELADA) {
    if (!suscripcion.mercadoPagoId)
      throw new HttpError(409, "Todavía estamos verificando el intento de pago. Volvé a intentar cuando Mercado Pago confirme el estado.");
    const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
      `/preapproval/${encodeURIComponent(suscripcion.mercadoPagoId)}`,
      { method: "PUT", body: { status: "canceled" } },
    );
    if (remota.status !== "cancelled" && remota.status !== "canceled")
      throw new HttpError(502, "Mercado Pago todavía no confirmó la cancelación.");
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        estado: EstadoSuscripcion.CANCELADA,
        canceladaAt: new Date(),
      },
    });
  }
  if (tokenId) {
    await prisma.tokenCancelacion.updateMany({
      where: { id: tokenId, usadoAt: null },
      data: { usadoAt: new Date() },
    });
  }

  try {
    await notificarCancelacion(suscripcion.id);
  } catch {
    console.error(
      "La suscripción quedó cancelada. El correo de confirmación sigue pendiente.",
    );
  }
  return {
    estado: EstadoSuscripcion.CANCELADA,
    periodoHasta: suscripcion.periodoHasta,
  };
}

export async function obtenerSuscripcionActual(usuarioId: string) {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
    select: {
      plan: true,
      ciclo: true,
      estado: true,
      monto: true,
      moneda: true,
      proximoCobroAt: true,
      periodoHasta: true,
      canceladaAt: true,
    },
  });
  return {
    suscripcion: suscripcion
      ? {
          plan: suscripcion.plan,
          ciclo: suscripcion.ciclo,
          estado: suscripcion.estado,
          monto: Number(suscripcion.monto),
          moneda: suscripcion.moneda,
          proximoCobroAt: suscripcion.proximoCobroAt,
          periodoHasta: suscripcion.periodoHasta,
          canceladaAt: suscripcion.canceladaAt,
        }
      : null,
  };
}

export function validarFirmaWebhook(
  firma: string | undefined,
  requestId: string | undefined,
  dataId: string | null,
  secreto: string,
): boolean {
  if (!firma || !requestId || !dataId) return false;
  const partes = Object.fromEntries(
    firma.split(",").map((parte) => {
      const [clave, valor] = parte.trim().split("=", 2);
      return [clave, valor];
    }),
  );
  const timestamp = partes.ts;
  const firmaRecibida = partes.v1;
  if (!timestamp || !firmaRecibida || !/^[a-f0-9]{64}$/i.test(firmaRecibida)) {
    return false;
  }

  const manifiesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const firmaEsperada = createHmac("sha256", secreto)
    .update(manifiesto)
    .digest();
  const firmaProporcionada = Buffer.from(firmaRecibida, "hex");
  return (
    firmaEsperada.length === firmaProporcionada.length &&
    timingSafeEqual(firmaEsperada, firmaProporcionada)
  );
}

export async function procesarWebhookMercadoPago(
  tipo: string,
  dataId: string,
): Promise<void> {
  if (tipo === "subscription_preapproval") {
    await procesarActualizacionSuscripcion(dataId);
    return;
  }
  if (tipo === "subscription_authorized_payment") {
    await procesarPagoAutorizado(dataId);
  }
}

async function procesarActualizacionSuscripcion(dataId: string): Promise<void> {
  const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
    `/preapproval/${encodeURIComponent(dataId)}`,
  );
  const referencia = parseId(remota.external_reference);
  if (!referencia) return;
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: referencia },
    select: { id: true, mercadoPagoId: true, estado: true },
  });
  if (!suscripcion || (suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== dataId)) return;
  const estadoRemoto =
    typeof remota.status === "string" ? remota.status.toLowerCase() : "";
  const cancelada = estadoRemoto === "cancelled" || estadoRemoto === "canceled";
  const rechazada = estadoRemoto === "rejected";
  const proximoCobroAt = fechaValida(remota.next_payment_date);
  const guardada = await prisma.suscripcion.updateMany({
    where: {
      id: suscripcion.id,
      OR: [{ mercadoPagoId: null }, { mercadoPagoId: dataId }],
      ...(rechazada ? { estado: { not: EstadoSuscripcion.CANCELADA } } : {}),
    },
    data: {
      mercadoPagoId: dataId,
      ...(cancelada ? { estado: EstadoSuscripcion.CANCELADA } : {}),
      ...(cancelada && suscripcion.estado !== EstadoSuscripcion.CANCELADA ? { canceladaAt: new Date() } : {}),
      ...(rechazada ? { estado: EstadoSuscripcion.VENCIDA } : {}),
      ...(proximoCobroAt ? { proximoCobroAt } : {}),
    },
  });
  if (guardada.count && cancelada) {
    await notificarCancelacion(suscripcion.id);
  }
}

async function procesarPagoAutorizado(dataId: string): Promise<void> {
  const pagoRemoto = await solicitarMercadoPago<PagoAutorizadoMercadoPago>(
    `/authorized_payments/${encodeURIComponent(dataId)}`,
  );
  const mercadoPagoId = parseId(pagoRemoto.id) ?? dataId;
  const preapprovalId = parseId(pagoRemoto.preapproval_id);
  const referenciaExterna = parseId(pagoRemoto.external_reference);
  const suscripcion = referenciaExterna
    ? await prisma.suscripcion.findUnique({
        where: { id: referenciaExterna },
        include: { usuario: { select: { email: true, nombre: true } } },
      })
    : preapprovalId
      ? await prisma.suscripcion.findFirst({
          where: { mercadoPagoId: preapprovalId },
          include: { usuario: { select: { email: true, nombre: true } } },
        })
      : null;
  if (
    !suscripcion ||
    (preapprovalId && suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== preapprovalId)
  ) {
    return;
  }

  const estadoRemoto = (
    pagoRemoto.payment?.status ??
    pagoRemoto.summarized ??
    pagoRemoto.status
  )
    ?.toString()
    .toLowerCase();
  const estado =
    estadoRemoto === "approved" || estadoRemoto === "accredited"
      ? EstadoPagoSuscripcion.APROBADO
      : estadoRemoto === "rejected"
        ? EstadoPagoSuscripcion.RECHAZADO
        : EstadoPagoSuscripcion.PENDIENTE;
  const vincularPreapproval = Boolean(preapprovalId && !suscripcion.mercadoPagoId);
  const detalles = preapprovalId && (vincularPreapproval || estado !== EstadoPagoSuscripcion.PENDIENTE)
    ? await solicitarMercadoPago<SuscripcionMercadoPago>(
        `/preapproval/${encodeURIComponent(preapprovalId)}`,
      )
    : null;
  if (vincularPreapproval && parseId(detalles?.external_reference) !== suscripcion.referenciaExterna)
    return;
  const monto =
    parseMonto(pagoRemoto.payment?.transaction_amount) ??
    parseMonto(pagoRemoto.transaction_amount);
  const moneda =
    typeof pagoRemoto.payment?.currency_id === "string"
      ? pagoRemoto.payment.currency_id
      : typeof pagoRemoto.currency_id === "string"
        ? pagoRemoto.currency_id
        : null;

  if (
    estado === EstadoPagoSuscripcion.APROBADO &&
    (monto === null ||
      moneda !== suscripcion.moneda ||
      Math.round(monto * 100) !== Math.round(Number(suscripcion.monto) * 100))
  ) {
    console.error(
      "Mercado Pago confirmó un importe o moneda inesperados; no se activó la suscripción.",
    );
    return;
  }

  const existe = await prisma.pagoSuscripcion.findUnique({
    where: { mercadoPagoId },
    select: { id: true, suscripcionId: true, correoEnviadoAt: true },
  });
  if (existe && existe.suscripcionId !== suscripcion.id) {
    throw new HttpError(409, "El pago ya está asociado a otra suscripción.");
  }
  const fechaAprobacion =
    fechaValida(pagoRemoto.payment?.date_created) ??
    fechaValida(pagoRemoto.date_created) ??
    new Date();
  const pago = await prisma.pagoSuscripcion.upsert({
    where: { mercadoPagoId },
    create: {
      suscripcionId: suscripcion.id,
      mercadoPagoId,
      estado,
      monto,
      moneda,
      aprobadoAt:
        estado === EstadoPagoSuscripcion.APROBADO ? fechaAprobacion : null,
    },
    update: {
      estado,
      monto,
      moneda,
      aprobadoAt:
        estado === EstadoPagoSuscripcion.APROBADO ? fechaAprobacion : null,
    },
  });

  let proximoCobroConfirmado = suscripcion.proximoCobroAt;
  let renovacionActiva = false;
  if (estado === EstadoPagoSuscripcion.APROBADO) {
    const proximoCobroAt = fechaValida(detalles?.next_payment_date);
    proximoCobroConfirmado = proximoCobroAt ?? proximoCobroConfirmado;
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        ...(preapprovalId ? { mercadoPagoId: preapprovalId } : {}),
        ...(proximoCobroAt
          ? { proximoCobroAt, periodoHasta: proximoCobroAt }
          : {}),
      },
    });
    const activada = await prisma.suscripcion.updateMany({
      where: { id: suscripcion.id, estado: { in: [EstadoSuscripcion.PENDIENTE, EstadoSuscripcion.ACTIVA] } },
      data: { estado: EstadoSuscripcion.ACTIVA },
    });
    renovacionActiva = activada.count > 0;
  } else if (
    estado === EstadoPagoSuscripcion.RECHAZADO &&
    detalles?.status === "rejected"
  ) {
    await prisma.suscripcion.updateMany({
      where: { id: suscripcion.id, estado: { not: EstadoSuscripcion.CANCELADA } },
      data: { estado: EstadoSuscripcion.VENCIDA, ...(preapprovalId ? { mercadoPagoId: preapprovalId } : {}) },
    });
  } else if (vincularPreapproval) {
    await prisma.suscripcion.updateMany({
      where: { id: suscripcion.id, mercadoPagoId: null },
      data: { mercadoPagoId: preapprovalId },
    });
  }

  if (estado !== EstadoPagoSuscripcion.PENDIENTE && !pago.correoEnviadoAt) {
    let accion: { texto: string; url: string } | undefined;
    if (
      estado === EstadoPagoSuscripcion.APROBADO &&
      renovacionActiva
    ) {
      const secreto = randomBytes(32).toString("base64url");
      const venceAt =
        proximoCobroConfirmado ??
        suscripcion.periodoHasta ??
        new Date(
          Date.now() + (suscripcion.ciclo === "ANUAL" ? 366 : 31) * 86400000,
        );
      await prisma.tokenCancelacion.create({
        data: {
          suscripcionId: suscripcion.id,
          tokenHash: hashToken(secreto),
          expiraAt: venceAt,
        },
      });
      const url = new URL(
        "/suscripcion/cancelar",
        process.env.FRONTEND_URL ?? "http://127.0.0.1:3001",
      );
      url.searchParams.set("token", secreto);
      accion = { texto: "Cancelar suscripción", url: url.toString() };
    }

    const aprobado = estado === EstadoPagoSuscripcion.APROBADO;
    const pagoSinRenovacion = aprobado && !renovacionActiva;
    const asunto = aprobado
      ? pagoSinRenovacion
        ? "Pago de InkManager confirmado"
        : "Tu suscripción de InkManager está confirmada"
      : "No pudimos procesar el pago de InkManager";
    const montoTexto =
      monto === null ? "" : ` Importe: ${formatoMoneda.format(monto)}.`;
    const mensaje = aprobado
      ? pagoSinRenovacion
        ? `Confirmamos un pago del plan ${nombresPlanes[suscripcion.plan]}.${montoTexto} La suscripción no tiene renovación activa.`
        : `Confirmamos el pago y la suscripción al plan ${nombresPlanes[suscripcion.plan]} con facturación ${nombreCiclo(suscripcion.ciclo)}.${montoTexto} El próximo cobro está previsto para ${fechaLegible(proximoCobroConfirmado)}.`
      : `El pago del plan ${nombresPlanes[suscripcion.plan]} fue rechazado.${montoTexto} Revisá el medio de pago en Mercado Pago para evitar interrupciones.`;
    await enviarCorreo(
      correoCuenta({
        para: suscripcion.usuario.email,
        nombre: suscripcion.usuario.nombre,
        asunto,
        mensaje,
        clave: `pago-suscripcion:${mercadoPagoId}`,
        ...(accion ? { accion } : {}),
      }),
    );
    await prisma.pagoSuscripcion.updateMany({
      where: { id: pago.id, correoEnviadoAt: null },
      data: { correoEnviadoAt: new Date() },
    });
  }
}

export async function enviarAvisosVencimiento(): Promise<void> {
  const ahora = new Date();
  const canceladas = await prisma.suscripcion.findMany({
    where: {
      estado: EstadoSuscripcion.CANCELADA,
      correoCancelacionEnviadoAt: null,
      canceladaAt: { gte: new Date(ahora.getTime() - 86400000) },
    },
    select: { id: true },
    take: 100,
  });
  for (const { id } of canceladas) {
    try {
      await notificarCancelacion(id);
    } catch {
      console.error(
        "El correo de confirmación de cancelación sigue pendiente.",
      );
    }
  }
  const hasta = new Date(ahora.getTime() + 3 * 86400000);
  const suscripciones = await prisma.suscripcion.findMany({
    where: {
      estado: EstadoSuscripcion.ACTIVA,
      proximoCobroAt: { gt: ahora, lte: hasta },
    },
    include: { usuario: { select: { email: true, nombre: true } } },
  });

  for (const suscripcion of suscripciones) {
    if (!suscripcion.proximoCobroAt) continue;
    const existente = await prisma.avisoVencimiento.findUnique({
      where: {
        suscripcionId_proximoCobroAt: {
          suscripcionId: suscripcion.id,
          proximoCobroAt: suscripcion.proximoCobroAt,
        },
      },
      select: { id: true },
    });
    if (existente) continue;

    try {
      await enviarCorreo(
        correoCuenta({
          para: suscripcion.usuario.email,
          nombre: suscripcion.usuario.nombre,
          asunto: "Tu próximo cobro de InkManager se acerca",
          mensaje: `El ${fechaLegible(suscripcion.proximoCobroAt)} se renovará tu plan ${nombresPlanes[suscripcion.plan]} por ${formatoMoneda.format(Number(suscripcion.monto))}.`,
          clave: `aviso-vencimiento:${suscripcion.id}:${suscripcion.proximoCobroAt.getTime()}`,
        }),
      );
      await prisma.avisoVencimiento.create({
        data: {
          suscripcionId: suscripcion.id,
          proximoCobroAt: suscripcion.proximoCobroAt,
        },
      });
    } catch (error) {
      console.error(
        "No se pudo enviar un aviso de vencimiento de suscripción.",
        error instanceof Error ? error.message : "Error desconocido.",
      );
    }
  }
}

export function iniciarAvisosVencimiento(): void {
  const cadaSeisHoras = 6 * 60 * 60 * 1000;
  const ejecutar = () => {
    void enviarAvisosVencimiento().catch((error: unknown) => {
      console.error(
        "Falló la tarea programada de avisos de vencimiento.",
        error instanceof Error ? error.message : "Error desconocido.",
      );
    });
  };
  ejecutar();
  setInterval(ejecutar, cadaSeisHoras).unref();
}
