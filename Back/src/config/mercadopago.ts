import "dotenv/config";
import { HttpError } from "../errors/http-error.js";

const api = "https://api.mercadopago.com";

export class ErrorMercadoPago extends HttpError {
  constructor(public estadoProveedor: number, compradorIncompatible = false) {
    super(
      compradorIncompatible ? 422 : 502,
      compradorIncompatible
        ? "Usá el correo de tu cuenta de Mercado Pago. Si estás probando, ingresá el correo del comprador de prueba."
        : "Mercado Pago no pudo completar la operación. Intentá nuevamente.",
    );
  }
}

export function obtenerAccessTokenMercadoPago(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new HttpError(
      503,
      "El servicio de pagos todavía no está configurado.",
    );
  }
  return token;
}

export function obtenerSecretoWebhookMercadoPago(): string {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secreto) {
    throw new HttpError(
      503,
      "La validación de notificaciones de pagos no está configurada.",
    );
  }
  return secreto;
}

export function obtenerUrlWebhookMercadoPago(): string {
  const configurada = process.env.MERCADOPAGO_WEBHOOK_URL?.trim();
  if (!configurada) {
    throw new HttpError(
      503,
      "Configurá una URL HTTPS pública para recibir las notificaciones de pago.",
    );
  }

  let url: URL;
  try {
    url = new URL(configurada);
  } catch {
    throw new HttpError(503, "La URL de notificaciones de pago no es válida.");
  }
  if (url.protocol !== "https:") {
    throw new HttpError(
      503,
      "La URL de notificaciones de pago debe usar HTTPS.",
    );
  }
  return url.toString();
}

export async function solicitarMercadoPago<T>(
  ruta: string,
  opciones: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${obtenerAccessTokenMercadoPago()}`,
    "Content-Type": "application/json",
  };
  if (opciones.idempotencyKey) {
    headers["X-Idempotency-Key"] = opciones.idempotencyKey;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${api}${ruta}`, {
      method: opciones.method ?? "GET",
      headers,
      ...(opciones.body === undefined
        ? {}
        : { body: JSON.stringify(opciones.body) }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(
      502,
      "No pudimos conectar con Mercado Pago. Intentá nuevamente.",
    );
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !cuerpo || typeof cuerpo !== "object") {
    console.error(`Mercado Pago respondió HTTP ${respuesta.status}.`);
    const compradorIncompatible =
      ruta === "/preapproval" &&
      opciones.method === "POST" &&
      respuesta.status === 400 &&
      (cuerpo as { message?: unknown } | null)?.message ===
        "Both payer and collector must be real or test users";
    throw new ErrorMercadoPago(respuesta.status, compradorIncompatible);
  }
  return cuerpo as T;
}

export function urlFrontend(ruta: string): string {
  const base = process.env.FRONTEND_URL ?? "http://127.0.0.1:3000";
  try {
    return new URL(ruta, base).toString();
  } catch {
    throw new HttpError(503, "La URL del frontend no es válida.");
  }
}
