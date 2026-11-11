import "dotenv/config";
import { HttpError } from "../errors/http-error.js";

export function configuracionCorreo() {
  const transporte =
    process.env.MAIL_TRANSPORT ??
    (process.env.NODE_ENV === "production" ? "resend" : "preview");
  if (transporte === "preview" && process.env.NODE_ENV !== "production") {
    return { transporte } as const;
  }
  if (
    transporte === "resend" &&
    process.env.RESEND_API_KEY &&
    process.env.MAIL_FROM
  ) {
    return {
      transporte,
      apiKey: process.env.RESEND_API_KEY,
      remitente: process.env.MAIL_FROM,
    } as const;
  }
  if (transporte === "brevo") {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const remitente = process.env.BREVO_SENDER_EMAIL?.trim();
    if (
      apiKey &&
      remitente &&
      /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(remitente)
    ) {
      return { transporte, apiKey, remitente } as const;
    }
  }
  throw new HttpError(
    503,
    "El servicio de correo todavía no está configurado.",
  );
}
