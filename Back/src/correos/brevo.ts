import { createHash } from "node:crypto";
import type { Correo } from "./correos.entity.js";
import { ErrorCorreo } from "./correos.errors.js";

const espacioCorreo = Buffer.from("b73b026f29ca4c66a10d19bd58cb5734", "hex");

// Brevo requiere un UUID. El mismo correo conserva su clave al reintentarlo.
function claveBrevo(clave: string) {
  const hash = createHash("sha1").update(espacioCorreo).update(clave).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const uuid = hash.toString("hex", 0, 16);
  return [
    uuid.slice(0, 8),
    uuid.slice(8, 12),
    uuid.slice(12, 16),
    uuid.slice(16, 20),
    uuid.slice(20),
  ].join("-");
}

export async function enviarPorBrevo(
  correo: Correo,
  config: { apiKey: string; remitente: string },
) {
  const remitente = { email: config.remitente, name: "InkManager" };
  let respuesta: Response;
  try {
    respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: remitente,
        replyTo: remitente,
        to: [{ email: correo.para }],
        subject: correo.asunto,
        htmlContent: correo.html,
        textContent: correo.texto,
        headers: { IdempotencyKey: claveBrevo(correo.clave) },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ErrorCorreo(
      "No pudimos conectar con Brevo o se agotó el tiempo de espera.",
    );
  }
  if (respuesta.ok) return;
  if (respuesta.status === 429)
    throw new ErrorCorreo(
      "Brevo limitó los envíos. Revisá la cuota e intentá más tarde.",
    );
  if (respuesta.status === 401)
    throw new ErrorCorreo(
      "Brevo rechazó la clave. Revisá BREVO_API_KEY en el backend.",
    );

  const error = (await respuesta.json().catch(() => null)) as {
    code?: string;
  } | null;
  if (respuesta.status === 400 && error?.code === "duplicate_parameter") return;
  if (respuesta.status === 400 || respuesta.status === 403)
    throw new ErrorCorreo(
      "Brevo rechazó el correo. Revisá el remitente y la activación de envíos transaccionales.",
    );
  throw new ErrorCorreo(
    `Brevo rechazó el envío (HTTP ${respuesta.status}). Revisá el registro en Brevo.`,
  );
}
