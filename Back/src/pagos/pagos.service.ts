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
import {
  MercadoPagoConfig,
  Payment,
} from "mercadopago";
import { DateTime } from "luxon";
import type { PreferenceResponse } from "mercadopago/dist/clients/preference/commonTypes.js";
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
import { esPreferenciaMercadoPago, tieneRenovacion, vencerPlanesSinRenovacion } from "./acceso-plan.js";
import {
  obtenerPrecio,
  validarPlanYCiclo,
} from "./planes.js";

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

type PagoUnicoMercadoPago = {
  id?: unknown;
  status?: unknown;
  external_reference?: unknown;
  transaction_amount?: unknown;
  currency_id?: unknown;
  date_approved?: unknown;
  date_created?: unknown;
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

function clienteMercadoPago() {
  return new MercadoPagoConfig({
    accessToken: obtenerAccessTokenMercadoPago(),
    options: { timeout: 10000 },
  });
}

function sumarUnAno(fecha: Date): Date {
  return DateTime.fromJSDate(fecha, { zone: "utc" }).plus({ years: 1 }).toJSDate();
}

function sumarUnMes(fecha: Date): Date {
  return DateTime.fromJSDate(fecha, { zone: "utc" }).plus({ months: 1 }).toJSDate();
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
    if (url.protocol !== "https:" || !dominioPermitido || url.port || url.username || url.password) {
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

async function pagoUnicoEnCurso(referencia: string) {
  const filtro = new URLSearchParams({ external_reference: referencia, limit: "50" });
  const resultado = await solicitarMercadoPago<{ results?: PagoUnicoMercadoPago[]; paging?: { total?: number } }>(
    "/v1/payments/search?" + filtro,
  );
  const total = resultado.paging?.total;
  if (!Array.isArray(resultado.results) || typeof total !== "number" ||
      !Number.isSafeInteger(total) || total < 0 || total !== resultado.results.length ||
      resultado.results.some(p => p?.external_reference !== referencia))
    throw new HttpError(409, "Mercado Pago todavía no confirmó el estado del intento anterior.");
  const pago = resultado.results.find(p =>
    !["rejected", "cancelled", "canceled", "refunded", "charged_back"].includes(String(p.status)));
  if (!pago) return null;
  const id = parseId(pago.id);
  if (!id) throw new HttpError(409, "Mercado Pago todavía está verificando el pago.");
  return id;
}

async function buscarFacturaMensual(preapprovalId: string, paymentId?: string) {
  const filtro = new URLSearchParams({ preapproval_id: preapprovalId });
  if (paymentId) filtro.set("payment_id", paymentId);
  const resultado = await solicitarMercadoPago<{ results?: PagoAutorizadoMercadoPago[] }>(
    "/authorized_payments/search?" + filtro,
  );
  if (!Array.isArray(resultado.results))
    throw new HttpError(502, "Mercado Pago todavía no confirmó el estado de la suscripción.");
  const aprobada = resultado.results.find(factura =>
    factura?.preapproval_id === preapprovalId &&
    (!paymentId || parseId(factura.payment?.id) === paymentId) &&
    ["approved", "accredited"].includes(String(factura.payment?.status).toLowerCase()));
  return parseId(aprobada?.id);
}

function rutaPreferencia(id: string): string {
  return "/checkout/preferences/" + encodeURIComponent(id);
}

async function cerrarPreferenciaPendiente(id: string, referencia: string) {
  const ruta = rutaPreferencia(id);
  const actual = await solicitarMercadoPago<PreferenceResponse>(ruta);
  if (actual.id !== id || actual.external_reference !== referencia) {
    throw new HttpError(502, "Mercado Pago no devolvió los datos del checkout pendiente.");
  }

  const ahora = Date.now();
  const fin = fechaValida(actual.expiration_date_to);
  if (!actual.expires || !fin || fin.getTime() > ahora) {
    const vencimiento = new Date(ahora - 1000);
    const inicio = fechaValida(actual.expiration_date_from);
    const cerrada = await solicitarMercadoPago<PreferenceResponse>(ruta, {
      method: "PUT",
      body: {
        expires: true,
        expiration_date_from: inicio && inicio < vencimiento
          ? inicio.toISOString()
          : new Date(ahora - 60_000).toISOString(),
        expiration_date_to: vencimiento.toISOString(),
      },
    });
    const finConfirmado = fechaValida(cerrada.expiration_date_to);
    if (
      cerrada.id !== id || cerrada.external_reference !== referencia ||
      !cerrada.expires || !finConfirmado || finConfirmado.getTime() > Date.now()
    ) {
      throw new HttpError(502, "Mercado Pago no confirmó el cierre del checkout.");
    }
  }
}

export async function crearSuscripcion(
  usuario: UsuarioSesion,
  entrada: unknown,
): Promise<
  | { checkoutUrl: string; subscriptionId: string }
  | { paymentProcessing: true; subscriptionId: string }
> {
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
    "cvv",
    "cvc",
    "pan",
    "expiration_date",
    "expirationDate",
    "expiration_month",
    "expiration_year",
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
  const monto = obtenerPrecio(plan, ciclo);
  const correoComprador = typeof datosEntrada.payer_email === "string"
    ? datosEntrada.payer_email.trim().toLowerCase()
    : usuario.email;
  const existente = await prisma.suscripcion.findFirst({
    where: {
      usuarioId: usuario.id,
      OR: [
        { estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PAUSADA] } },
        {
          estado: EstadoSuscripcion.CANCELADA,
          periodoHasta: { gt: ahora },
        },
      ],
    },
    select: { id: true, estado: true, periodoHasta: true, bonificada: true, ciclo: true, mercadoPagoId: true },
  });
  if (existente?.estado === "ACTIVA" && existente.periodoHasta && existente.periodoHasta <= ahora &&
      !tieneRenovacion(existente)) {
    await vencerPlanesSinRenovacion(prisma, usuario.id, ahora);
  } else if (existente) {
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
    select: { id: true, mercadoPagoId: true, mpPaymentId: true, plan: true, ciclo: true, monto: true },
  });

  obtenerAccessTokenMercadoPago();
  obtenerSecretoWebhookMercadoPago();
  const notificationUrl = obtenerUrlWebhookMercadoPago();
  for (const intento of intentosPendientes) {
    if (intento.mpPaymentId) return { paymentProcessing: true, subscriptionId: intento.id };
    if (!intento.mercadoPagoId) {
      throw new HttpError(
        409,
        "Todavía estamos verificando el intento anterior. Revisá el estado de tu suscripción antes de volver a pagar.",
      );
    }
    if (intento.ciclo === CicloSuscripcion.ANUAL || esPreferenciaMercadoPago(intento.mercadoPagoId)) {
      const preferencia = await solicitarMercadoPago<PreferenceResponse>(rutaPreferencia(intento.mercadoPagoId));
      if (preferencia.id !== intento.mercadoPagoId || preferencia.external_reference !== intento.id)
        throw new HttpError(502, "Mercado Pago no confirmó la referencia del intento anterior.");
      const fin = fechaValida(preferencia.expiration_date_to);
      if (preferencia.expires && fin && fin <= ahora) {
        const pago = await pagoUnicoEnCurso(intento.id);
        if (pago) {
          await procesarPagoUnico(pago);
          return { paymentProcessing: true, subscriptionId: intento.id };
        }
        await prisma.suscripcion.updateMany({
          where: { id: intento.id, estado: "PENDIENTE", mpPaymentId: null },
          data: { estado: "ERROR" },
        });
        continue;
      }
      if (intento.plan === plan && intento.ciclo === ciclo && !cardTokenId) {
        if (Number(intento.monto) !== monto)
          throw new HttpError(409, "El precio cambió. Cancelá el intento pendiente desde Suscripción para continuar.");
        return {
          checkoutUrl: urlCheckout(preferencia.init_point),
          subscriptionId: intento.id,
        };
      }
      throw new HttpError(
        409,
        "Tenés un checkout pendiente. Cancelalo desde Suscripción antes de iniciar otro intento.",
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
      if (!cardTokenId && intento.plan === plan && intento.ciclo === ciclo && remota.init_point) {
        if (Number(intento.monto) !== monto || correoComprador !== usuario.email)
          throw new HttpError(409, "Cancelá el intento pendiente desde Suscripción para usar el precio actual o cambiar el correo.");
        return { checkoutUrl: urlCheckout(remota.init_point), subscriptionId: intento.id };
      }
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
    const subscriptionId = suscripcion.id;
    const referencia = encodeURIComponent(subscriptionId);
    const motivo = "InkManager - Plan " + nombresPlanes[plan];
    if (ciclo === "MENSUAL") {
      const respuesta = await solicitarMercadoPago<SuscripcionMercadoPago>("/preapproval", {
        method: "POST",
        idempotencyKey: subscriptionId,
        body: {
          reason: motivo + " mensual",
          payer_email: correoComprador,
          external_reference: subscriptionId,
          back_url: urlFrontend("/checkout/pending/" + referencia),
          status: cardTokenId ? "authorized" : "pending",
          ...(cardTokenId && { card_token_id: cardTokenId }),
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: monto, currency_id: "ARS" },
        },
      });
      const proveedorId = parseId(respuesta.id);
      if (!proveedorId || (respuesta.external_reference !== undefined && respuesta.external_reference !== subscriptionId))
        throw new HttpError(502, "Mercado Pago devolvió una suscripción inválida.");
      const checkoutUrl = cardTokenId ? undefined : urlCheckout(respuesta.init_point);
      await prisma.suscripcion.update({
        where: { id: subscriptionId, OR: [{ mercadoPagoId: null }, { mercadoPagoId: proveedorId }] },
        data: { mercadoPagoId: proveedorId },
      });
      return checkoutUrl ? { checkoutUrl, subscriptionId } : { paymentProcessing: true, subscriptionId };
    }

    if (cardTokenId) {
      const respuesta = await solicitarMercadoPago<PagoUnicoMercadoPago>("/v1/payments", {
        method: "POST",
        idempotencyKey: subscriptionId,
        body: {
          description: motivo + " anual", external_reference: subscriptionId,
          transaction_amount: monto, token: cardTokenId, payment_method_id: datosEntrada.payment_method_id,
          installments: 1, payer: { email: usuario.email,
            identification: { type: "DNI", number: datosEntrada.identification_number } },
          notification_url: notificationUrl,
        },
      });
      const paymentId = parseId(respuesta.id);
      if (!paymentId || respuesta.external_reference !== subscriptionId ||
          respuesta.currency_id !== "ARS" || Math.round(Number(respuesta.transaction_amount) * 100) !== Math.round(monto * 100))
        throw new HttpError(502, "El pago anual no coincide con el plan elegido.");
      await prisma.suscripcion.update({
        where: { id: subscriptionId, OR: [{ mpPaymentId: null }, { mpPaymentId: paymentId }] },
        data: { mpPaymentId: paymentId },
      });
      await procesarPagoUnico(paymentId);
      return { paymentProcessing: true, subscriptionId };
    }

    const puedeVolver = new URL(urlFrontend("/")).protocol === "https:";
    const respuesta = await solicitarMercadoPago<PreferenceResponse>("/checkout/preferences", {
      method: "POST",
      idempotencyKey: subscriptionId,
      body: {
        external_reference: subscriptionId,
        items: [{ id: "inkmanager-" + plan.toLowerCase() + "-anual", title: motivo + " anual",
          quantity: 1, unit_price: monto, currency_id: "ARS" }],
        payer: { email: usuario.email },
        payment_methods: { installments: 1 },
        notification_url: notificationUrl,
        expires: true,
        expiration_date_from: ahora.toISOString(),
        expiration_date_to: new Date(ahora.getTime() + 30 * 60_000).toISOString(),
        ...(puedeVolver && {
          back_urls: {
            success: urlFrontend("/checkout/success?subscription_id=" + referencia),
            pending: urlFrontend("/checkout/pending?subscription_id=" + referencia),
            failure: urlFrontend("/checkout/failure?subscription_id=" + referencia),
          },
          auto_return: "approved",
        }),
      },
    });
    const checkoutUrl = urlCheckout(respuesta.init_point);
    if (!respuesta.id || respuesta.external_reference !== subscriptionId)
      throw new HttpError(502, "Mercado Pago devolvió una preferencia inválida.");
    await prisma.suscripcion.update({
      where: { id: subscriptionId },
      data: { mercadoPagoId: respuesta.id },
    });
    return { checkoutUrl, subscriptionId };
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
  if (!suscripcion || suscripcion.bonificada || suscripcion.correoCancelacionEnviadoAt) return;

  await enviarCorreo(
    correoCuenta({
      para: suscripcion.usuario.email,
      nombre: suscripcion.usuario.nombre,
      asunto: "Tu suscripción de InkManager fue cancelada",
      mensaje: `Cancelamos tu plan ${nombresPlanes[suscripcion.plan]}. No se realizarán nuevos cobros.` +
        (suscripcion.periodoHasta && suscripcion.periodoHasta > new Date()
          ? ` Podés usar el servicio hasta ${fechaLegible(suscripcion.periodoHasta)}.` : ""),
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
  inmediata = false,
): Promise<{ estado: EstadoSuscripcion; periodoHasta: Date | null }> {
  let suscripcion: {
    id: string;
    ciclo: CicloSuscripcion;
    bonificada: boolean;
    estado: EstadoSuscripcion;
    mercadoPagoId: string | null;
    mpPaymentId: string | null;
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
            ciclo: true,
            bonificada: true,
            estado: true,
            mercadoPagoId: true,
            mpPaymentId: true,
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
            EstadoSuscripcion.PAUSADA,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ciclo: true,
        bonificada: true,
        estado: true,
        mercadoPagoId: true,
        mpPaymentId: true,
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
  if (suscripcion.bonificada)
    throw new HttpError(409, "Un administrador gestiona este plan bonificado.");
  if (suscripcion.estado === "PENDIENTE" && !suscripcion.mercadoPagoId && !suscripcion.mpPaymentId)
    throw new HttpError(409, "Todavía estamos verificando el intento de pago. Volvé a intentar cuando Mercado Pago confirme el estado.");
  if (suscripcion.estado !== EstadoSuscripcion.CANCELADA) {
    const renovacion = tieneRenovacion(suscripcion);
    if (
      renovacion &&
      !suscripcion.mercadoPagoId
    )
      throw new HttpError(409, "Todavía estamos verificando el intento de pago. Volvé a intentar cuando Mercado Pago confirme el estado.");
    if (
      renovacion &&
      suscripcion.mercadoPagoId
    ) {
      if (suscripcion.estado === EstadoSuscripcion.PENDIENTE) {
        const factura = await buscarFacturaMensual(suscripcion.mercadoPagoId);
        if (factura) {
          await procesarPagoAutorizado(factura);
          throw new HttpError(409, "Este intento ya tiene un pago. Actualizá Suscripción para revisar el estado y la renovación.");
        }
      }
      const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
        `/preapproval/${encodeURIComponent(suscripcion.mercadoPagoId)}`,
        { method: "PUT", body: { status: "cancelled" } },
      );
      if (remota.status !== "cancelled" && remota.status !== "canceled")
        throw new HttpError(502, "Mercado Pago todavía no confirmó la cancelación.");
    } else {
      if (suscripcion.mpPaymentId && suscripcion.estado === EstadoSuscripcion.PENDIENTE) {
        const cancelado = await new Payment(clienteMercadoPago()).cancel({
          id: Number(suscripcion.mpPaymentId),
        });
        if (cancelado.status !== "cancelled") {
          throw new HttpError(502, "Mercado Pago no confirmó la cancelación del pago pendiente.");
        }
      } else if (
        suscripcion.mercadoPagoId &&
        suscripcion.estado === EstadoSuscripcion.PENDIENTE
      ) {
        await cerrarPreferenciaPendiente(suscripcion.mercadoPagoId, suscripcion.id);
        const pago = await pagoUnicoEnCurso(suscripcion.id);
        if (pago) {
          await procesarPagoUnico(pago);
          throw new HttpError(409, "El checkout ya tiene un pago. Actualizá Suscripción para consultar su estado.");
        }
      }
    }
    const datosCancelacion = {
      estado: EstadoSuscripcion.CANCELADA,
      canceladaAt: new Date(),
      proximoCobroAt: null,
      ...(inmediata ? { periodoHasta: new Date() } : {}),
    };
    if (!renovacion && suscripcion.estado === EstadoSuscripcion.PENDIENTE) {
      const cierre = await prisma.suscripcion.updateMany({
        where: { id: suscripcion.id, estado: "PENDIENTE", mpPaymentId: suscripcion.mpPaymentId },
        data: datosCancelacion,
      });
      if (!cierre.count) {
        const actual = await prisma.suscripcion.findUnique({
          where: { id: suscripcion.id }, select: { estado: true },
        });
        if (actual?.estado !== "CANCELADA")
          throw new HttpError(409, "El intento cambió de estado. Actualizá Suscripción antes de continuar.");
      }
    } else {
      await prisma.suscripcion.update({ where: { id: suscripcion.id }, data: datosCancelacion });
    }
  } else if (inmediata && suscripcion.periodoHasta && suscripcion.periodoHasta > new Date()) {
    await prisma.suscripcion.update({
      where: { id: suscripcion.id }, data: { periodoHasta: new Date(), proximoCobroAt: null },
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
    periodoHasta: inmediata ? new Date() : suscripcion.periodoHasta,
  };
}

export async function obtenerSuscripcionActual(usuarioId: string) {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      plan: true,
      ciclo: true,
      bonificada: true,
      mercadoPagoId: true,
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
          id: suscripcion.id,
          plan: suscripcion.plan,
          ciclo: suscripcion.ciclo,
          estado: suscripcion.estado === "ACTIVA" && !tieneRenovacion(suscripcion) &&
            suscripcion.periodoHasta && suscripcion.periodoHasta <= new Date() ? "VENCIDA" : suscripcion.estado,
          bonificada: suscripcion.bonificada,
          renovacion: tieneRenovacion(suscripcion) && suscripcion.estado !== "CANCELADA",
          monto: Number(suscripcion.monto),
          moneda: suscripcion.moneda,
          proximoCobroAt: tieneRenovacion(suscripcion) ? suscripcion.proximoCobroAt : null,
          periodoHasta: suscripcion.periodoHasta,
          canceladaAt: suscripcion.canceladaAt,
          periodoAbonadoVigente:
            suscripcion.estado === EstadoSuscripcion.CANCELADA &&
            suscripcion.periodoHasta !== null &&
            suscripcion.periodoHasta > new Date(),
        }
      : null,
  };
}

export async function obtenerEstadoSuscripcion(
  suscripcionId: string,
  usuarioId: string,
  verificarPago = false,
) {
  const consulta = () => prisma.suscripcion.findFirst({
    where: { id: suscripcionId, usuarioId },
    select: {
      id: true,
      plan: true,
      ciclo: true,
      estado: true,
      monto: true,
      moneda: true,
      proximoCobroAt: true,
      periodoHasta: true,
      mercadoPagoId: true,
      bonificada: true,
    },
  });
  let suscripcion = await consulta();
  if (verificarPago && suscripcion?.estado === EstadoSuscripcion.PENDIENTE &&
      suscripcion.mercadoPagoId && tieneRenovacion(suscripcion)) {
    const factura = await buscarFacturaMensual(suscripcion.mercadoPagoId);
    if (factura) {
      await procesarPagoAutorizado(factura);
      suscripcion = await consulta();
    }
  }
  if (!suscripcion) {
    throw new HttpError(404, "No encontramos esa suscripción.");
  }
  const { mercadoPagoId: _mercadoPagoId, bonificada: _bonificada, ...estado } = suscripcion;
  return {
    subscription: {
      ...estado,
      importe: Number(suscripcion.monto),
    },
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
    return;
  }
  if (tipo === "payment" || tipo === "payment.updated") {
    await procesarPagoUnico(dataId);
  }
}

async function notificarPago(
  pagoId: string,
  estado: EstadoPagoSuscripcion,
  correo: ReturnType<typeof correoCuenta>,
) {
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "PagoSuscripcion" WHERE "id" = ${pagoId} FOR UPDATE`;
    const pago = await tx.pagoSuscripcion.findUnique({
      where: { id: pagoId }, select: { estado: true, correoEnviadoAt: true },
    });
    if (!pago || pago.estado !== estado || pago.correoEnviadoAt) return;
    await enviarCorreo(correo);
    await tx.pagoSuscripcion.update({
      where: { id: pagoId }, data: { correoEnviadoAt: new Date() },
    });
  }, { timeout: 20_000 }).catch(() => {
    console.error("El pago quedó registrado. El correo de confirmación sigue pendiente.");
  });
}

async function procesarPagoUnico(dataId: string): Promise<void> {
  if (!/^\d+$/.test(dataId)) return;
  const pago = await solicitarMercadoPago<PagoUnicoMercadoPago>("/v1/payments/" + encodeURIComponent(dataId));
  const paymentId = parseId(pago.id);
  const referencia = parseId(pago.external_reference);
  if (paymentId !== dataId || !referencia) return;

  const aviso = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Suscripcion" WHERE "id" = ${referencia} FOR UPDATE`;
    const suscripcion = await tx.suscripcion.findUnique({
      where: { id: referencia },
      include: { usuario: { select: { email: true, nombre: true, id: true } } },
    });

    if (
      !suscripcion ||
      suscripcion.bonificada ||
      (suscripcion.mpPaymentId && suscripcion.mpPaymentId !== paymentId) ||
      suscripcion.estado === EstadoSuscripcion.CANCELADA
    ) {
      return;
    }
    if (tieneRenovacion(suscripcion)) {
      if (suscripcion.mercadoPagoId && ["approved", "accredited"].includes(String(pago.status).toLowerCase()))
        return { preapprovalId: suscripcion.mercadoPagoId };
      return;
    }

    const monto = Number(pago.transaction_amount);
    const precioEsperado = Number(suscripcion.monto);
    if (
      pago.currency_id !== suscripcion.moneda ||
      !Number.isFinite(monto) ||
      Math.round(monto * 100) !== Math.round(precioEsperado * 100)
    ) {
      console.error(
        `Mercado Pago notificó un pago con importe o moneda inválidos. Esperado: ${precioEsperado} ${suscripcion.moneda}, recibido: ${monto} ${pago.currency_id}`,
      );
      return;
    }

    const estadoRemoto = String(pago.status ?? "").toLowerCase();
    const estadoPago =
      estadoRemoto === "approved" || estadoRemoto === "accredited"
        ? EstadoPagoSuscripcion.APROBADO
        : ["rejected", "cancelled", "canceled", "refunded", "charged_back"].includes(estadoRemoto)
          ? EstadoPagoSuscripcion.RECHAZADO
          : EstadoPagoSuscripcion.PENDIENTE;

    const anterior = await tx.pagoSuscripcion.findUnique({
      where: { mercadoPagoId: paymentId }, select: { suscripcionId: true, estado: true, aprobadoAt: true },
    });
    if (anterior && (anterior.suscripcionId !== suscripcion.id ||
        (anterior.estado === "APROBADO" && estadoPago === "PENDIENTE"))) return;
    const fechaAprobacion =
      anterior?.aprobadoAt ??
      fechaValida(pago.date_approved) ??
      fechaValida(pago.date_created) ??
      new Date();

    const pagoGuardado = await tx.pagoSuscripcion.upsert({
      where: { mercadoPagoId: paymentId },
      create: {
        suscripcionId: suscripcion.id,
        mercadoPagoId: paymentId,
        estado: estadoPago,
        monto,
        moneda: suscripcion.moneda,
        aprobadoAt:
          estadoPago === EstadoPagoSuscripcion.APROBADO
            ? fechaAprobacion
            : null,
      },
      update: {
        estado: estadoPago,
        monto,
        moneda: suscripcion.moneda,
        aprobadoAt:
          estadoPago === EstadoPagoSuscripcion.APROBADO
            ? fechaAprobacion
            : null,
      },
    });

    const estadoSuscripcion =
      estadoPago === EstadoPagoSuscripcion.APROBADO
        ? EstadoSuscripcion.ACTIVA
        : estadoPago === EstadoPagoSuscripcion.RECHAZADO
          ? EstadoSuscripcion.RECHAZADA
          : EstadoSuscripcion.PENDIENTE;

    const periodoHasta =
      estadoPago === EstadoPagoSuscripcion.APROBADO
        ? suscripcion.ciclo === CicloSuscripcion.ANUAL
          ? sumarUnAno(fechaAprobacion)
          : sumarUnMes(fechaAprobacion)
        : null;

    await tx.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        mpPaymentId: paymentId,
        estado: estadoSuscripcion,
        periodoHasta,
        proximoCobroAt: null,
      },
    });

    if (
      estadoPago !== EstadoPagoSuscripcion.PENDIENTE &&
      !pagoGuardado.correoEnviadoAt
    ) {
      const aprobado = estadoPago === EstadoPagoSuscripcion.APROBADO;
      const ciclo = suscripcion.ciclo === CicloSuscripcion.ANUAL ? "anual" : "mensual";
      const periodoTexto = periodoHasta ? fechaLegible(periodoHasta) : "pronto";
      const renovacion = "El acceso vence al finalizar ese período.";

      return {
        pagoId: pagoGuardado.id,
        estado: estadoPago,
        correo: correoCuenta({
          para: suscripcion.usuario.email,
          nombre: suscripcion.usuario.nombre,
          asunto: aprobado
            ? `Tu pago ${ciclo} de InkManager está confirmado`
            : `No pudimos procesar tu pago ${ciclo} de InkManager`,
          mensaje: aprobado
            ? `Confirmamos el pago ${ciclo} del plan ${nombresPlanes[suscripcion.plan]} por ${formatoMoneda.format(monto)}. Tu acceso estará disponible hasta ${periodoTexto}. ${renovacion}`
            : `El pago ${ciclo} del plan ${nombresPlanes[suscripcion.plan]} fue rechazado. Revisá el medio de pago e intentá nuevamente.`,
          clave: `pago-suscripcion:${paymentId}`,
        }),
      };
    }
  });
  if (aviso && "preapprovalId" in aviso && aviso.preapprovalId) {
    const factura = await buscarFacturaMensual(aviso.preapprovalId, paymentId);
    if (factura) await procesarPagoAutorizado(factura);
  } else if (aviso && "pagoId" in aviso && aviso.pagoId) {
    await notificarPago(aviso.pagoId, aviso.estado, aviso.correo);
  }
}

async function procesarActualizacionSuscripcion(dataId: string): Promise<void> {
  const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
    `/preapproval/${encodeURIComponent(dataId)}`,
  );
  const referencia = parseId(remota.external_reference);
  if (!referencia || parseId(remota.id) !== dataId) return;

  const canceladaId = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Suscripcion" WHERE "id" = ${referencia} FOR UPDATE`;
    const suscripcion = await tx.suscripcion.findUnique({
      where: { id: referencia },
      select: {
        id: true,
        mercadoPagoId: true,
        bonificada: true,
        ciclo: true,
        estado: true,
        periodoHasta: true,
      },
    });

    if (
      !suscripcion ||
      !tieneRenovacion(suscripcion) ||
      (suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== dataId)
    ) {
      return;
    }

    const estadoRemoto =
      typeof remota.status === "string" ? remota.status.toLowerCase() : "";
    const cancelada =
      estadoRemoto === "cancelled" || estadoRemoto === "canceled";
    const rechazada = estadoRemoto === "rejected";
    const pausada = estadoRemoto === "paused";
    const tienePeriodo = suscripcion.periodoHasta && suscripcion.periodoHasta > new Date();
    const terminada = cancelada || (rechazada && tienePeriodo);
    const proximoCobroAt = fechaValida(remota.next_payment_date);

    const guardada = await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        OR: [{ mercadoPagoId: null }, { mercadoPagoId: dataId }],
        estado: { not: EstadoSuscripcion.CANCELADA },
      },
      data: {
        mercadoPagoId: dataId,
        ...(terminada ? { estado: EstadoSuscripcion.CANCELADA, canceladaAt: new Date(), proximoCobroAt: null } :
          rechazada ? { estado: EstadoSuscripcion.VENCIDA, proximoCobroAt: null } :
          pausada ? { estado: EstadoSuscripcion.PAUSADA, proximoCobroAt: null } :
          estadoRemoto === "authorized" && suscripcion.estado === "PAUSADA"
            ? { estado: tienePeriodo ? EstadoSuscripcion.ACTIVA : EstadoSuscripcion.PENDIENTE, proximoCobroAt }
            : proximoCobroAt ? { proximoCobroAt } : {}),
      },
    });

    if (guardada.count && terminada) return suscripcion.id;
  });
  if (canceladaId) await notificarCancelacion(canceladaId).catch(() => {
    console.error("La suscripción quedó cancelada. El correo de confirmación sigue pendiente.");
  });
}

async function procesarPagoAutorizado(dataId: string): Promise<void> {
  const pagoRemoto = await solicitarMercadoPago<PagoAutorizadoMercadoPago>(
    `/authorized_payments/${encodeURIComponent(dataId)}`,
  );
  const mercadoPagoId = parseId(pagoRemoto.id);
  const preapprovalId = parseId(pagoRemoto.preapproval_id);
  const referenciaExterna = parseId(pagoRemoto.external_reference);
  if (mercadoPagoId !== dataId || !preapprovalId) return;

  const candidata = await prisma.suscripcion.findFirst({
    where: { OR: [{ mercadoPagoId: preapprovalId }, ...(referenciaExterna ? [{ referenciaExterna }] : [])] },
    select: { id: true, ciclo: true, bonificada: true, mercadoPagoId: true, referenciaExterna: true },
  });
  if (!candidata || !tieneRenovacion(candidata) ||
      (candidata.mercadoPagoId && candidata.mercadoPagoId !== preapprovalId) ||
      (referenciaExterna && candidata.referenciaExterna !== referenciaExterna)) return;
  const detalles = await solicitarMercadoPago<SuscripcionMercadoPago>(
    `/preapproval/${encodeURIComponent(preapprovalId)}`,
  );
  if (parseId(detalles.id) !== preapprovalId ||
      parseId(detalles.external_reference) !== candidata.referenciaExterna) return;

  const aviso = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Suscripcion" WHERE "id" = ${candidata.id} FOR UPDATE`;
    const suscripcion = await tx.suscripcion.findUnique({
      where: { id: candidata.id },
      include: { usuario: { select: { email: true, nombre: true } } },
    });
    if (!suscripcion || (suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== preapprovalId)) return;
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

    const existe = await tx.pagoSuscripcion.findUnique({
      where: { mercadoPagoId },
      select: { id: true, suscripcionId: true, estado: true, aprobadoAt: true },
    });

    if (existe && existe.suscripcionId !== suscripcion.id) {
      throw new HttpError(409, "El pago ya está asociado a otra suscripción.");
    }
    if (existe?.estado === "APROBADO" && estado !== "APROBADO") return;

    const fechaAprobacion =
      existe?.aprobadoAt ??
      fechaValida(pagoRemoto.payment?.date_created) ??
      fechaValida(pagoRemoto.debit_date) ??
      fechaValida(pagoRemoto.date_created) ??
      new Date();

    const pago = await tx.pagoSuscripcion.upsert({
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
        ...(existe && existe.estado !== estado ? { correoEnviadoAt: null } : {}),
      },
    });

    let proximoCobroConfirmado = suscripcion.proximoCobroAt;
    let renovacionActiva = false;

    if (estado === EstadoPagoSuscripcion.APROBADO && existe?.estado !== EstadoPagoSuscripcion.APROBADO) {
      const proximoCobroAt = fechaValida(detalles.next_payment_date);
      const finPagado = proximoCobroAt && proximoCobroAt > fechaAprobacion
        ? proximoCobroAt : sumarUnMes(fechaAprobacion);
      proximoCobroConfirmado = proximoCobroAt ?? proximoCobroConfirmado;
      const activada = await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        estado: { in: [EstadoSuscripcion.PENDIENTE, EstadoSuscripcion.ACTIVA] },
      },
      data: {
        estado: EstadoSuscripcion.ACTIVA,
        mercadoPagoId: preapprovalId,
        periodoHasta: suscripcion.periodoHasta && suscripcion.periodoHasta > finPagado ? suscripcion.periodoHasta : finPagado,
        proximoCobroAt: proximoCobroConfirmado,
      },
      });

      renovacionActiva = activada.count > 0;

    } else if (estado === EstadoPagoSuscripcion.APROBADO) {
      renovacionActiva = suscripcion.estado === EstadoSuscripcion.ACTIVA;
    } else if (
      estado === EstadoPagoSuscripcion.RECHAZADO &&
      detalles.status === "rejected" &&
      (!suscripcion.periodoHasta || suscripcion.periodoHasta <= new Date())
    ) {
      await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        estado: { not: EstadoSuscripcion.CANCELADA },
      },
      data: {
        estado: EstadoSuscripcion.VENCIDA,
        mercadoPagoId: preapprovalId,
        proximoCobroAt: null,
      },
      });

    } else if (!suscripcion.mercadoPagoId) {
      await tx.suscripcion.updateMany({
      where: { id: suscripcion.id, mercadoPagoId: null },
      data: { mercadoPagoId: preapprovalId },
      });
    }

    if (estado !== EstadoPagoSuscripcion.PENDIENTE && !pago.correoEnviadoAt) {
      let accion: { texto: string; url: string } | undefined;

      if (estado === EstadoPagoSuscripcion.APROBADO && renovacionActiva) {
      const secreto = randomBytes(32).toString("base64url");
      const venceAt =
        proximoCobroConfirmado ??
        suscripcion.periodoHasta ??
        new Date(
          Date.now() + (suscripcion.ciclo === "ANUAL" ? 366 : 31) * 86400000,
        );

      await tx.tokenCancelacion.create({
        data: {
          suscripcionId: suscripcion.id,
          tokenHash: hashToken(secreto),
          expiraAt: venceAt,
        },
      });

      const url = new URL(
        "/suscripcion/cancelar",
        process.env.FRONTEND_URL ?? "http://127.0.0.1:3000",
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

      return {
        pagoId: pago.id,
        estado,
        correo: correoCuenta({
          para: suscripcion.usuario.email,
          nombre: suscripcion.usuario.nombre,
          asunto,
          mensaje,
          clave: `pago-suscripcion:${mercadoPagoId}:${estado}`,
          ...(accion ? { accion } : {}),
        }),
      };
    }
  });
  if (aviso) await notificarPago(aviso.pagoId, aviso.estado, aviso.correo);
}

export async function enviarAvisosVencimiento(): Promise<void> {
  const ahora = new Date();
  const canceladas = await prisma.suscripcion.findMany({
    where: {
      bonificada: false,
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
      bonificada: false,
      ciclo: "MENSUAL",
      estado: EstadoSuscripcion.ACTIVA,
      proximoCobroAt: { gt: ahora, lte: hasta },
    },
    include: { usuario: { select: { email: true, nombre: true } } },
  });

  for (const suscripcion of suscripciones) {
    if (!suscripcion.proximoCobroAt || !tieneRenovacion(suscripcion)) continue;
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
