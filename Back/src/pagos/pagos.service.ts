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
  Preference,
} from "mercadopago";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes.js";
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
import {
  obtenerPlanes,
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
  const fin = new Date(fecha);
  fin.setFullYear(fin.getFullYear() + 1);
  return fin;
}

function sumarUnMes(fecha: Date): Date {
  const fin = new Date(fecha);
  fin.setMonth(fin.getMonth() + 1);
  return fin;
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

/**
 * Otorga permisos/rol al usuario cuando su suscripción es aprobada.
 * Actualiza el rol y el plan activo de forma atómica en una transacción.
 */
async function otorgarPermisosSuscripcion(
  usuarioId: string,
  plan: PlanSuscripcion,
): Promise<void> {
  const rolNecesario = plan === "INDIVIDUAL" ? "ARTISTA" : "ESTUDIO_ADMIN";

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true, suspendidoAt: true },
  });

  if (!usuario) {
    throw new HttpError(404, "El usuario no existe.");
  }

  if (usuario.suspendidoAt !== null) {
    throw new HttpError(
      403,
      "No se puede activar la suscripción de una cuenta suspendida.",
    );
  }

  if (usuario.rol !== rolNecesario) {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        rol: rolNecesario,
        planSuscripcionActivo: plan,
      } as any,
    });
  } else {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { planSuscripcionActivo: plan } as any,
    });
  }
}

/**
 * Revoca permisos/rol al usuario cuando su suscripción es cancelada.
 * Si no tiene otras suscripciones activas, lo devuelve a CLIENTE.
 */
async function revocarPermisosSuscripcion(usuarioId: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { 
      id: true, 
      suscripciones: {
        select: { estado: true },
      },
    },
  });

  if (!usuario) return;

  const tieneOtraSuscripcionActiva = usuario.suscripciones?.some(
    (s) => s.estado === "ACTIVA",
  );

  if (!tieneOtraSuscripcionActiva) {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        rol: "CLIENTE",
        planSuscripcionActivo: null,
      } as any,
    });
  }
}

export async function crearSuscripcion(
  usuario: UsuarioSesion,
  entrada: unknown,
): Promise<
  | { checkoutUrl: string; subscriptionId?: string }
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
    if (intento.ciclo === CicloSuscripcion.ANUAL) {
      if (intento.plan === plan && intento.ciclo === ciclo && !cardTokenId) {
        return {
          checkoutUrl: urlCheckout(
            (await new Preference(clienteMercadoPago()).get({
              preferenceId: intento.mercadoPagoId,
            })).init_point,
          ),
          subscriptionId: intento.id,
        };
      }
      throw new HttpError(
        409,
        "Tenés un checkout anual pendiente. Cancelalo desde Suscripción antes de iniciar otro intento.",
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
    /**
     * Crea un pago anual con tarjeta de crédito tokenizada
     */
    async function crearPagoAnualConTarjeta({
      suscripcionId,
      usuario,
      plan,
      cardTokenId,
      paymentMethodId,
      identificationNumber,
      notificationUrl,
    }: {
      suscripcionId: string;
      usuario: UsuarioSesion;
      plan: PlanSuscripcion;
      cardTokenId: string;
      paymentMethodId: string;
      identificationNumber: string;
      notificationUrl: string;
    }): Promise<{ paymentProcessing: true; subscriptionId: string }> {
      const monto = obtenerPrecio(plan, "ANUAL");
      let respuesta: PaymentResponse;
      try {
        respuesta = await new Payment(clienteMercadoPago()).create({
          body: {
            description: `InkManager - Plan ${nombresPlanes[plan]} anual`,
            external_reference: suscripcionId,
            transaction_amount: monto,
            token: cardTokenId,
            payment_method_id: paymentMethodId,
            installments: 1,
            payer: {
              email: usuario.email,
              identification: { type: "DNI", number: identificationNumber },
            },
            notification_url: notificationUrl,
          },
          requestOptions: { idempotencyKey: suscripcionId },
        });
      } catch (error) {
        await prisma.suscripcion.updateMany({
          where: { id: suscripcionId, estado: EstadoSuscripcion.PENDIENTE },
          data: { estado: EstadoSuscripcion.ERROR },
        });
        console.error(`Mercado Pago no confirmó el pago anual ${suscripcionId}:`, error);
        throw new HttpError(502, "Mercado Pago no pudo iniciar el pago anual.");
      }

      const paymentId = parseId(respuesta.id);
      if (
        !paymentId ||
        respuesta.external_reference !== suscripcionId ||
        respuesta.currency_id !== "ARS" ||
        Math.round(Number(respuesta.transaction_amount) * 100) !==
          Math.round(monto * 100)
      ) {
        await prisma.suscripcion.updateMany({
          where: { id: suscripcionId, estado: EstadoSuscripcion.PENDIENTE },
          data: { estado: EstadoSuscripcion.ERROR },
        });
        throw new HttpError(502, "El pago anual no coincide con el plan elegido.");
      }

      await prisma.suscripcion.update({
        where: { id: suscripcionId },
        data: { mpPaymentId: paymentId },
      });
      await procesarPagoAnual(paymentId);
      return { paymentProcessing: true, subscriptionId: suscripcionId };
    }

    /**
     * Crea un checkout anual con Preferences de Mercado Pago (Checkout Pro)
     */
    async function crearCheckoutAnual({
      suscripcionId,
      usuario,
      plan,
      notificationUrl,
    }: {
      suscripcionId: string;
      usuario: UsuarioSesion;
      plan: PlanSuscripcion;
      notificationUrl: string;
    }): Promise<{ checkoutUrl: string; subscriptionId: string }> {
      const planConfig = obtenerPlanes().find((item) => item.id === plan);
      if (!planConfig) throw new HttpError(400, "El plan elegido no existe.");
      const expiraAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      let respuesta: PreferenceResponse;
      try {
        respuesta = await new Preference(clienteMercadoPago()).create({
          body: {
            external_reference: suscripcionId,
            items: [
              {
                id: `inkmanager-${plan.toLowerCase()}-anual`,
                title: `InkManager - Plan ${planConfig.nombre} anual`,
                quantity: 1,
                unit_price: planConfig.anual,
                currency_id: planConfig.moneda,
              },
            ],
            payer: { email: usuario.email },
            payment_methods: { installments: 1 },
            notification_url: notificationUrl,
            back_urls: {
              success: urlFrontend(
                `/checkout/success?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
              pending: urlFrontend(
                `/checkout/pending?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
              failure: urlFrontend(
                `/checkout/failure?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
            },
            auto_return: "approved",
            expires: true,
            expiration_date_to: expiraAt,
          },
          requestOptions: { idempotencyKey: suscripcionId },
        });
      } catch (error) {
        await prisma.suscripcion.updateMany({
          where: { id: suscripcionId, estado: EstadoSuscripcion.PENDIENTE },
          data: { estado: EstadoSuscripcion.ERROR },
        });
        console.error(`Mercado Pago no creó la preferencia anual ${suscripcionId}:`, error);
        throw new HttpError(502, "Mercado Pago no pudo iniciar el checkout anual.");
      }

      const checkoutUrl = urlCheckout(respuesta.init_point);
      if (!respuesta.id || respuesta.external_reference !== suscripcionId) {
        throw new HttpError(502, "Mercado Pago devolvió una preferencia inválida.");
      }
      await prisma.suscripcion.update({
        where: { id: suscripcionId },
        data: { mercadoPagoId: respuesta.id },
      });
      return { checkoutUrl, subscriptionId: suscripcionId };
    }

    /**
     * Crea un checkout mensual con Preferences de Mercado Pago (Checkout Pro)
     */
    async function crearCheckoutMensual({
      suscripcionId,
      usuario,
      plan,
      notificationUrl,
    }: {
      suscripcionId: string;
      usuario: UsuarioSesion;
      plan: PlanSuscripcion;
      notificationUrl: string;
    }): Promise<{ checkoutUrl: string; subscriptionId: string }> {
      const planConfig = obtenerPlanes().find((item) => item.id === plan);
      if (!planConfig) throw new HttpError(400, "El plan elegido no existe.");
      const expiraAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      let respuesta: PreferenceResponse;
      try {
        respuesta = await new Preference(clienteMercadoPago()).create({
          body: {
            external_reference: suscripcionId,
            items: [
              {
                id: `inkmanager-${plan.toLowerCase()}-mensual`,
                title: `InkManager - Plan ${planConfig.nombre} mensual`,
                quantity: 1,
                unit_price: planConfig.mensual,
                currency_id: planConfig.moneda,
              },
            ],
            payer: { email: usuario.email },
            payment_methods: { installments: 1 },
            notification_url: notificationUrl,
            back_urls: {
              success: urlFrontend(
                `/checkout/success?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
              pending: urlFrontend(
                `/checkout/pending?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
              failure: urlFrontend(
                `/checkout/failure?subscription_id=${encodeURIComponent(suscripcionId)}`,
              ),
            },
            auto_return: "approved",
            expires: true,
            expiration_date_to: expiraAt,
          },
          requestOptions: { idempotencyKey: suscripcionId },
        });
      } catch (error) {
        await prisma.suscripcion.updateMany({
          where: { id: suscripcionId, estado: EstadoSuscripcion.PENDIENTE },
          data: { estado: EstadoSuscripcion.ERROR },
        });
        console.error(`Mercado Pago no creó la preferencia mensual ${suscripcionId}:`, error);
        throw new HttpError(502, "Mercado Pago no pudo iniciar el checkout mensual.");
      }

      const checkoutUrl = urlCheckout(respuesta.init_point);
      if (!respuesta.id || respuesta.external_reference !== suscripcionId) {
        throw new HttpError(502, "Mercado Pago devolvió una preferencia inválida.");
      }
      await prisma.suscripcion.update({
        where: { id: suscripcionId },
        data: { mercadoPagoId: respuesta.id },
      });
      return { checkoutUrl, subscriptionId: suscripcionId };
    }

    if (ciclo === "ANUAL") {
      if (typeof cardTokenId === "string") {
        return await crearPagoAnualConTarjeta({
          suscripcionId: suscripcion.id,
          usuario,
          plan,
          cardTokenId,
          paymentMethodId: datosEntrada.payment_method_id as string,
          identificationNumber: datosEntrada.identification_number as string,
          notificationUrl,
        });
      }
      return await crearCheckoutAnual({
        suscripcionId: suscripcion.id,
        usuario,
        plan,
        notificationUrl,
      });
    }

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
            frequency: 1,
            frequency_type: "months",
            transaction_amount: monto,
            currency_id: "ARS",
          },
          back_url: `${backUrl}?subscription_id=${encodeURIComponent(suscripcion.id)}`,
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
      return { paymentProcessing: true, subscriptionId: suscripcion.id };
    }

    return await crearCheckoutMensual({
      suscripcionId: suscripcion.id,
      usuario,
      plan,
      notificationUrl,
    });
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
  inmediata = false,
): Promise<{ estado: EstadoSuscripcion; periodoHasta: Date | null }> {
  let suscripcion: {
    id: string;
    ciclo: CicloSuscripcion;
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
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ciclo: true,
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
  if (suscripcion.estado !== EstadoSuscripcion.CANCELADA) {
    if (
      suscripcion.ciclo === CicloSuscripcion.MENSUAL &&
      !suscripcion.mercadoPagoId
    )
      throw new HttpError(409, "Todavía estamos verificando el intento de pago. Volvé a intentar cuando Mercado Pago confirme el estado.");
    if (
      suscripcion.ciclo === CicloSuscripcion.MENSUAL &&
      suscripcion.mercadoPagoId
    ) {
      const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
        `/preapproval/${encodeURIComponent(suscripcion.mercadoPagoId)}`,
        { method: "PUT", body: { status: "canceled" } },
      );
      if (remota.status !== "cancelled" && remota.status !== "canceled")
        throw new HttpError(502, "Mercado Pago todavía no confirmó la cancelación.");
    } else if (suscripcion.ciclo === CicloSuscripcion.ANUAL) {
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
        const cliente = new Preference(clienteMercadoPago());
        const actual = await cliente.get({
          preferenceId: suscripcion.mercadoPagoId,
        });
        if (!actual.items?.length) {
          throw new HttpError(502, "Mercado Pago no devolvió los datos del checkout pendiente.");
        }
        const preference = await cliente.update({
          id: suscripcion.mercadoPagoId,
          updatePreferenceRequest: {
            items: actual.items,
            expires: true,
            expiration_date_to: new Date(Date.now() + 60_000).toISOString(),
          },
        });
        if (preference.id !== suscripcion.mercadoPagoId) {
          throw new HttpError(502, "Mercado Pago no confirmó el cierre del checkout.");
        }
      }
    }
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        estado: EstadoSuscripcion.CANCELADA,
        canceladaAt: new Date(),
        ...(inmediata ? { periodoHasta: new Date(), proximoCobroAt: null } : {}),
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
    periodoHasta: inmediata ? new Date() : suscripcion.periodoHasta,
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
) {
  const suscripcion = await prisma.suscripcion.findFirst({
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
    },
  });
  if (!suscripcion) {
    throw new HttpError(404, "No encontramos esa suscripción.");
  }
  return {
    subscription: {
      ...suscripcion,
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
    await procesarPagoAnual(dataId);
  }
}

async function procesarPagoAnual(dataId: string): Promise<void> {
  const pago = await new Payment(clienteMercadoPago()).get({
    id: Number(dataId),
  });
  const paymentId = parseId(pago.id);
  const referencia = parseId(pago.external_reference);
  if (!paymentId || !referencia) return;

  await prisma.$transaction(async (tx) => {
    const suscripcion = await tx.suscripcion.findUnique({
      where: { id: referencia },
      include: { usuario: { select: { email: true, nombre: true, id: true } } },
    });

    if (
      !suscripcion ||
      (suscripcion.ciclo !== CicloSuscripcion.ANUAL && suscripcion.ciclo !== CicloSuscripcion.MENSUAL) ||
      (suscripcion.mpPaymentId && suscripcion.mpPaymentId !== paymentId) ||
      suscripcion.estado === EstadoSuscripcion.CANCELADA
    ) {
      return;
    }

    const monto = Number(pago.transaction_amount);
    const precioEsperado = obtenerPrecio(suscripcion.plan, suscripcion.ciclo);
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
        : estadoRemoto === "rejected" || estadoRemoto === "cancelled"
          ? EstadoPagoSuscripcion.RECHAZADO
          : EstadoPagoSuscripcion.PENDIENTE;

    const fechaAprobacion =
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
        proximoCobroAt:
          estadoPago === EstadoPagoSuscripcion.APROBADO &&
          suscripcion.ciclo === CicloSuscripcion.MENSUAL
            ? sumarUnMes(fechaAprobacion)
            : null,
      },
    });

    if (
      estadoPago === EstadoPagoSuscripcion.APROBADO &&
      suscripcion.usuario.id
    ) {
      try {
        await otorgarPermisosSuscripcion(
          suscripcion.usuario.id,
          suscripcion.plan,
        );
      } catch (error) {
        console.error(
          `Error al otorgar permisos para la suscripción ${suscripcion.id}:`,
          error instanceof Error ? error.message : "Error desconocido",
        );
      }
    }

    if (
      estadoPago !== EstadoPagoSuscripcion.PENDIENTE &&
      !pagoGuardado.correoEnviadoAt
    ) {
      const aprobado = estadoPago === EstadoPagoSuscripcion.APROBADO;
      const ciclo = suscripcion.ciclo === CicloSuscripcion.ANUAL ? "anual" : "mensual";
      const periodoTexto = periodoHasta ? fechaLegible(periodoHasta) : "pronto";
      const renovacion = suscripcion.ciclo === CicloSuscripcion.MENSUAL
        ? "Se realizará un nuevo cobro automático cada mes."
        : "No se realizará un nuevo cobro automático.";

      await enviarCorreo(
        correoCuenta({
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
      );
      await tx.pagoSuscripcion.updateMany({
        where: { id: pagoGuardado.id, correoEnviadoAt: null },
        data: { correoEnviadoAt: new Date() },
      });
    }
  });
}

async function procesarActualizacionSuscripcion(dataId: string): Promise<void> {
  const remota = await solicitarMercadoPago<SuscripcionMercadoPago>(
    `/preapproval/${encodeURIComponent(dataId)}`,
  );
  const referencia = parseId(remota.external_reference);
  if (!referencia) return;

  await prisma.$transaction(async (tx) => {
    const suscripcion = await tx.suscripcion.findUnique({
      where: { id: referencia },
      select: {
        id: true,
        mercadoPagoId: true,
        estado: true,
        usuarioId: true,
      },
    });

    if (
      !suscripcion ||
      (suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== dataId)
    ) {
      return;
    }

    const estadoRemoto =
      typeof remota.status === "string" ? remota.status.toLowerCase() : "";
    const cancelada =
      estadoRemoto === "cancelled" || estadoRemoto === "canceled";
    const rechazada = estadoRemoto === "rejected";
    const proximoCobroAt = fechaValida(remota.next_payment_date);

    const guardada = await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        OR: [{ mercadoPagoId: null }, { mercadoPagoId: dataId }],
        ...(rechazada ? { estado: { not: EstadoSuscripcion.CANCELADA } } : {}),
      },
      data: {
        mercadoPagoId: dataId,
        ...(cancelada ? { estado: EstadoSuscripcion.CANCELADA } : {}),
        ...(cancelada && suscripcion.estado !== EstadoSuscripcion.CANCELADA
          ? { canceladaAt: new Date() }
          : {}),
        ...(rechazada ? { estado: EstadoSuscripcion.VENCIDA } : {}),
        ...(proximoCobroAt ? { proximoCobroAt } : {}),
      },
    });

    if (guardada.count > 0 && (cancelada || rechazada)) {
      try {
        await revocarPermisosSuscripcion(suscripcion.usuarioId);
      } catch (error) {
        console.error(
          `Error al revocar permisos para la suscripción ${suscripcion.id}:`,
          error instanceof Error ? error.message : "Error desconocido",
        );
      }
    }

    if (guardada.count && cancelada) {
      await notificarCancelacion(suscripcion.id);
    }
  });
}

async function procesarPagoAutorizado(dataId: string): Promise<void> {
  const pagoRemoto = await solicitarMercadoPago<PagoAutorizadoMercadoPago>(
    `/authorized_payments/${encodeURIComponent(dataId)}`,
  );
  const mercadoPagoId = parseId(pagoRemoto.id) ?? dataId;
  const preapprovalId = parseId(pagoRemoto.preapproval_id);
  const referenciaExterna = parseId(pagoRemoto.external_reference);

  let suscripcion;

  if (referenciaExterna) {
    suscripcion = await prisma.suscripcion.findUnique({
      where: { id: referenciaExterna },
      include: { usuario: { select: { email: true, nombre: true, id: true } } },
    });
  } else if (preapprovalId) {
    suscripcion = await prisma.suscripcion.findFirst({
      where: { mercadoPagoId: preapprovalId },
      include: { usuario: { select: { email: true, nombre: true, id: true } } },
    });
  } else {
    suscripcion = null;
  }

  if (
    !suscripcion ||
    (preapprovalId && suscripcion.mercadoPagoId && suscripcion.mercadoPagoId !== preapprovalId)
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
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
    const detalles =
      preapprovalId && (vincularPreapproval || estado !== EstadoPagoSuscripcion.PENDIENTE)
      ? await solicitarMercadoPago<SuscripcionMercadoPago>(
          `/preapproval/${encodeURIComponent(preapprovalId)}`,
        )
      : null;

    if (
      vincularPreapproval &&
      parseId(detalles?.external_reference) !== suscripcion.referenciaExterna
    ) {
      return;
    }

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
      select: { id: true, suscripcionId: true, correoEnviadoAt: true },
    });

    if (existe && existe.suscripcionId !== suscripcion.id) {
      throw new HttpError(409, "El pago ya está asociado a otra suscripción.");
    }

    const fechaAprobacion =
      fechaValida(pagoRemoto.payment?.date_created) ??
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
      },
    });

    let proximoCobroConfirmado = suscripcion.proximoCobroAt;
    let renovacionActiva = false;

    if (estado === EstadoPagoSuscripcion.APROBADO) {
      const proximoCobroAt = fechaValida(detalles?.next_payment_date);
      proximoCobroConfirmado = proximoCobroAt ?? proximoCobroConfirmado;

      await tx.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        ...(preapprovalId ? { mercadoPagoId: preapprovalId } : {}),
        ...(proximoCobroAt
          ? { proximoCobroAt, periodoHasta: proximoCobroAt }
          : {}),
      },
      });

      const activada = await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        estado: { in: [EstadoSuscripcion.PENDIENTE, EstadoSuscripcion.ACTIVA] },
      },
      data: { estado: EstadoSuscripcion.ACTIVA },
      });

      renovacionActiva = activada.count > 0;

      if (renovacionActiva && suscripcion.usuario.id) {
      try {
        await otorgarPermisosSuscripcion(
          suscripcion.usuario.id,
          suscripcion.plan,
        );
      } catch (error) {
        console.error(
          `Error al otorgar permisos para la suscripción ${suscripcion.id}:`,
          error instanceof Error ? error.message : "Error desconocido",
        );
      }
      }
    } else if (
      estado === EstadoPagoSuscripcion.RECHAZADO &&
      detalles?.status === "rejected"
    ) {
      await tx.suscripcion.updateMany({
      where: {
        id: suscripcion.id,
        estado: { not: EstadoSuscripcion.CANCELADA },
      },
      data: {
        estado: EstadoSuscripcion.VENCIDA,
        ...(preapprovalId ? { mercadoPagoId: preapprovalId } : {}),
      },
      });

      try {
      await revocarPermisosSuscripcion(suscripcion.usuario.id);
      } catch (error) {
      console.error(
        `Error al revocar permisos para la suscripción ${suscripcion.id}:`,
        error instanceof Error ? error.message : "Error desconocido",
      );
      }
    } else if (vincularPreapproval) {
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

      await tx.pagoSuscripcion.updateMany({
      where: { id: pago.id, correoEnviadoAt: null },
      data: { correoEnviadoAt: new Date() },
      });
    }
  });
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
