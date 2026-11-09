import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { HttpError } from "../errors/http-error.js";

export function coincide(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function firmaValida(body: Buffer, firma: string, secreto: string) {
  const hash = createHmac("sha256", secreto).update(body).digest("hex");
  return coincide(firma, "sha256=" + hash);
}

export function cifrarToken(clave: Buffer, identidad: string, token: string) {
  const iv = randomBytes(12);
  const cifrado = createCipheriv("aes-256-gcm", clave, iv);
  cifrado.setAAD(Buffer.from(identidad));
  const valor = Buffer.concat([cifrado.update(token, "utf8"), cifrado.final()]);
  return [iv, cifrado.getAuthTag(), valor]
    .map((parte) => parte.toString("base64url"))
    .join(".");
}

export function abrirToken(clave: Buffer, identidad: string, token: string) {
  try {
    const [iv, tag, valor] = token
      .split(".")
      .map((parte) => Buffer.from(parte, "base64url"));
    const cifrado = createDecipheriv("aes-256-gcm", clave, iv);
    cifrado.setAAD(Buffer.from(identidad));
    cifrado.setAuthTag(tag);
    return Buffer.concat([cifrado.update(valor), cifrado.final()]).toString(
      "utf8",
    );
  } catch {
    throw new HttpError(
      503,
      "No pudimos abrir la conexión. Volvé a autorizar la cuenta.",
    );
  }
}
