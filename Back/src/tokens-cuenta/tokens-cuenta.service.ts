import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { origenesPermitidos } from "../config/auth.js";
import { configuracionCorreo } from "../config/correos.js";
import { HttpError } from "../errors/http-error.js";
import {
  validarEmail,
  validarPassword,
} from "../usuarios/usuarios.validation.js";
import { enviarCorreo } from "../correos/correos.service.js";
import { correoCuenta } from "../correos/correos.templates.js";
import { registrarErrorCorreo } from "../correos/correos.errors.js";
import {
  buscarDestinatario,
  buscarToken,
  buscarUltimoToken,
  consumirToken,
  guardarToken,
} from "./tokens-cuenta.repository.js";
import type {
  DestinatarioCuenta,
  TipoTokenCuenta,
} from "./tokens-cuenta.entity.js";

export const mensajeSolicitudCorreo =
  "Si existe una cuenta con ese email, recibirás un enlace. Revisá también el correo no deseado.";
export const hashTokenCuenta = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function crearEnlace(usuarioId: string, tipo: TipoTokenCuenta) {
  const token = randomBytes(32).toString("hex");
  const hash = hashTokenCuenta(token);
  const minutos = tipo === "PASSWORD" ? 30 : 24 * 60;
  await guardarToken(
    usuarioId,
    tipo,
    hash,
    new Date(Date.now() + minutos * 60_000),
  );
  const ruta =
    tipo === "PASSWORD" ? "/restablecer-contrasena" : "/verificar-email";
  const url = new URL(ruta, origenesPermitidos[0]);
  // El fragmento no se envía al servidor web ni aparece en sus access logs.
  url.hash = token;
  return { url: url.toString(), hash };
}

export async function notificarRegistro(
  usuario: DestinatarioCuenta,
  google = false,
): Promise<void> {
  try {
    configuracionCorreo();
    const enlace = await crearEnlace(
      usuario.id,
      google ? "PASSWORD" : "VERIFICAR_EMAIL",
    );
    await enviarCorreo(
      correoCuenta({
        para: usuario.email,
        nombre: usuario.nombre,
        asunto: "Bienvenido a InkManager",
        clave: `bienvenida/${usuario.id}`,
        mensaje: google
          ? "Tu cuenta ya está lista y podés ingresar con Google. Si también querés entrar con email y contraseña, creá una contraseña con este enlace. Es opcional y vence en 30 minutos."
          : "Tu cuenta ya está lista. Confirmá tu email para mantener tus datos de contacto al día. Este enlace vence en 24 horas.",
        accion: {
          texto: google ? "Crear mi contraseña" : "Verificar mi email",
          url: enlace.url,
        },
      }),
    );
  } catch (error) {
    // La cuenta ya existe: un problema del correo no debe convertir el registro en un error.
    registrarErrorCorreo("No se pudo enviar la bienvenida.", error);
  }
}

function leerDatos(entrada: unknown): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    throw new HttpError(400, "Enviá los datos como JSON.");
  return entrada as Record<string, unknown>;
}

export function validarSolicitudCorreo(entrada: unknown): string {
  configuracionCorreo();
  return validarEmail(leerDatos(entrada).email);
}

export async function solicitarEnlace(
  email: string,
  tipo: TipoTokenCuenta,
): Promise<void> {
  const usuario = await buscarDestinatario(email);
  if (!usuario || (tipo === "VERIFICAR_EMAIL" && usuario.emailVerificado))
    return;
  const ultimo = await buscarUltimoToken(usuario.id, tipo);
  if (
    ultimo &&
    !ultimo.usadoAt &&
    ultimo.createdAt.getTime() > Date.now() - 60_000
  )
    return;
  const enlace = await crearEnlace(usuario.id, tipo);
  await enviarCorreo(
    correoCuenta({
      para: usuario.email,
      nombre: usuario.nombre,
      asunto:
        tipo === "PASSWORD"
          ? "Tu contraseña de InkManager"
          : "Confirmá tu email",
      mensaje:
        tipo === "PASSWORD"
          ? "Recibimos una solicitud para crear o restablecer tu contraseña. El enlace vence en 30 minutos y solo puede usarse una vez. Si no lo pediste, ignorá este correo: tu cuenta no cambia."
          : "Confirmá que este es tu email. El enlace vence en 24 horas y solo puede usarse una vez.",
      clave: `enlace/${enlace.hash}`,
      accion: {
        texto:
          tipo === "PASSWORD" ? "Elegir una contraseña" : "Verificar mi email",
        url: enlace.url,
      },
    }),
  );
}

function validarToken(token: unknown): string {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(
      400,
      "El enlace no es válido o ya venció. Solicitá uno nuevo.",
    );
  return hashTokenCuenta(token);
}

export async function restablecerPassword(entrada: unknown): Promise<void> {
  const datos = leerDatos(entrada);
  const hash = validarToken(datos.token);
  const password = validarPassword(datos.password);
  if (datos.confirmPassword !== password)
    throw new HttpError(400, "Las contraseñas deben coincidir.");
  const token = await buscarToken(hash);
  if (
    !token ||
    token.tipo !== "PASSWORD" ||
    token.usadoAt ||
    token.expiraAt <= new Date()
  )
    throw new HttpError(
      400,
      "El enlace no es válido o ya venció. Solicitá uno nuevo.",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  const usuario = await consumirToken(hash, "PASSWORD", passwordHash);
  try {
    await enviarCorreo(
      correoCuenta({
        para: usuario.email,
        nombre: usuario.nombre,
        asunto: "Tu contraseña fue actualizada",
        mensaje:
          "Tu contraseña se actualizó y cerramos las sesiones abiertas. Ya podés iniciar sesión con tu nueva contraseña. Si no hiciste este cambio, recuperá tu cuenta y contactá al equipo de InkManager.",
        clave: `password-actualizada/${hash}`,
      }),
    );
  } catch (error) {
    registrarErrorCorreo(
      "La contraseña se actualizó, pero no se pudo enviar su confirmación.",
      error,
    );
  }
}

export async function confirmarEmail(entrada: unknown): Promise<void> {
  const token = leerDatos(entrada).token;
  await consumirToken(validarToken(token), "VERIFICAR_EMAIL");
}
