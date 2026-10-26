import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { configuracionCorreo } from "../config/correos.js";
import type { Correo } from "./correos.entity.js";
import { ErrorCorreo } from "./correos.errors.js";

export async function enviarCorreo(correo: Correo): Promise<void> {
  const config = configuracionCorreo();
  if (config.transporte === "preview") {
    const carpeta = new URL("../../.mail-preview/", import.meta.url);
    await mkdir(carpeta, { recursive: true });
    await writeFile(
      new URL(`${randomUUID()}.json`, carpeta),
      JSON.stringify(correo, null, 2),
      { mode: 0o600 },
    );
    console.info(
      "Correo guardado en Back/.mail-preview (no se envió por Internet).",
    );
    return;
  }
  let respuesta: Response;
  try {
    respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": correo.clave,
      },
      body: JSON.stringify({
        from: config.remitente,
        to: [correo.para],
        subject: correo.asunto,
        text: correo.texto,
        html: correo.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ErrorCorreo(
      "No pudimos conectar con Resend o se agotó el tiempo de espera.",
    );
  }
  if (!respuesta.ok) {
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    const mensaje =
      cuerpo &&
      typeof cuerpo === "object" &&
      "message" in cuerpo &&
      typeof cuerpo.message === "string"
        ? cuerpo.message
        : "";
    const claveRestringida =
      cuerpo &&
      typeof cuerpo === "object" &&
      "name" in cuerpo &&
      cuerpo.name === "restricted_api_key";
    if (claveRestringida)
      throw new ErrorCorreo(
        "La API key no tiene permiso para este envío. Revisá el dominio y los permisos de la clave en Resend.",
      );
    if (
      respuesta.status === 403 &&
      mensaje.includes("You can only send testing emails")
    ) {
      throw new ErrorCorreo(
        "Resend rechazó el destinatario: onboarding@resend.dev solo puede enviar al email de tu cuenta de Resend. Para otras personas, verificá un dominio propio.",
      );
    }
    if (respuesta.status === 401)
      throw new ErrorCorreo(
        "Resend rechazó la API key. Revisá RESEND_API_KEY en Back/.env.",
      );
    if (respuesta.status === 403)
      throw new ErrorCorreo(
        "Resend no autorizó el envío. Revisá el dominio de MAIL_FROM y los permisos de la API key.",
      );
    if (respuesta.status === 429)
      throw new ErrorCorreo(
        "Resend limitó los envíos. Revisá la cuota del servicio e intentá más tarde.",
      );
    throw new ErrorCorreo(
      `Resend rechazó el envío (HTTP ${respuesta.status}). Revisá el registro del proveedor en su panel.`,
    );
  }
}
