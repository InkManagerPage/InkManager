import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { CodeChallengeMethod, type TokenPayload } from "google-auth-library";
import { obtenerClienteGoogle } from "../config/google.js";
import { jwtSecret } from "../config/auth.js";
import { HttpError } from "../errors/http-error.js";
import {
  validarEmail,
  validarPerfilRegistro,
} from "../usuarios/usuarios.validation.js";
import type { IdentidadGoogle } from "./google.entity.js";
import { Prisma } from "@prisma/client";
import {
  buscarUsuarioPorEmail,
  buscarUsuarioPorGoogleId,
  crearUsuarioGoogle,
} from "../usuarios/usuarios.repository.js";
import type { UsuarioSesion } from "../usuarios/usuarios.entity.js";
export const duracionFlujoGoogleSegundos = 10 * 60;

export async function prepararAccesoGoogle(registro?: unknown) {
  const perfilRegistro =
    registro === undefined ? undefined : validarPerfilRegistro(registro);
  const cliente = obtenerClienteGoogle();

  //STATE - Comprobar que la respuesta corresponde al acceso iniciado desde ese navegador
  const state = crypto.randomBytes(32).toString("hex");
  // NONCE - Comprobar que el token de identidad corresponde a este intento
  const nonce = crypto.randomBytes(32).toString("hex");

  // CODE VERIFIER - Vincular el código recibido con nuestro intercambio mediante PKCE
  const { codeVerifier, codeChallenge } =
    await cliente.generateCodeVerifierAsync();

  const url = cliente.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "select_account",
  });

  const flujoToken = jwt.sign(
    { state, nonce, codeVerifier, registro: perfilRegistro },
    jwtSecret,
    {
      algorithm: "HS256",
      expiresIn: duracionFlujoGoogleSegundos,
      issuer: "inkmanager-api",
      audience: "inkmanager-google-oauth",
    },
  );

  return { url, flujoToken };
}

export function validarFlujoGoogle(flujoToken: unknown, state: unknown) {
  if (
    typeof flujoToken !== "string" ||
    !flujoToken ||
    typeof state !== "string" ||
    !state
  ) {
    throw new HttpError(
      400,
      "Faltan los datos del acceso con Google. Iniciá nuevamente.",
    );
  }

  try {
    const flujo = jwt.verify(flujoToken, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "inkmanager-api",
      audience: "inkmanager-google-oauth",
    });

    if (
      typeof flujo === "string" ||
      typeof flujo.exp !== "number" ||
      flujo.state !== state ||
      typeof flujo.nonce !== "string" ||
      !flujo.nonce ||
      typeof flujo.codeVerifier !== "string" ||
      !flujo.codeVerifier
    ) {
      throw new Error("El flujo de Google no es válido.");
    }

    return {
      nonce: flujo.nonce,
      codeVerifier: flujo.codeVerifier,
      registro:
        flujo.registro === undefined
          ? undefined
          : validarPerfilRegistro(flujo.registro),
    };
  } catch {
    throw new HttpError(
      400,
      "El intento de acceso es inválido o venció. Iniciá nuevamente.",
    );
  }
}

export async function obtenerIdentidadGoogle(
  code: unknown,
  flujoToken: unknown,
  state: unknown,
): Promise<IdentidadGoogle> {
  const flujo = validarFlujoGoogle(flujoToken, state);

  if (typeof code !== "string" || !code.trim()) {
    throw new HttpError(400, "Google no devolvió un código válido.");
  }

  const cliente = obtenerClienteGoogle();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new HttpError(503, "El acceso con Google no está configurado.");
  }

  let perfil: TokenPayload | undefined;

  try {
    const { tokens } = await cliente.getToken({
      code,
      codeVerifier: flujo.codeVerifier,
    });

    if (!tokens.id_token) {
      throw new Error("Google no devolvió un token de identidad.");
    }

    const ticket = await cliente.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    perfil = ticket.getPayload();
  } catch {
    throw new HttpError(
      401,
      "No pudimos validar el acceso con Google. Iniciá nuevamente.",
    );
  }

  if (
    !perfil ||
    typeof perfil.sub !== "string" ||
    !perfil.sub ||
    perfil.nonce !== flujo.nonce ||
    perfil.email_verified !== true ||
    !perfil.email
  ) {
    throw new HttpError(401, "La identidad de Google no es válida.");
  }

  return {
    googleId: perfil.sub,
    email: validarEmail(perfil.email),
    nombre: perfil.name?.trim() || "Usuario de Google",
    registro: flujo.registro,
  };
}

export async function resolverUsuarioGoogle(
  identidad: IdentidadGoogle,
): Promise<UsuarioSesion> {
  const usuario = await buscarUsuarioPorGoogleId(identidad.googleId);
  if (usuario) return usuario;

  if (await buscarUsuarioPorEmail(identidad.email)) {
    throw new HttpError(
      409,
      "Ya existe una cuenta con ese email. Iniciá sesión con tu método habitual.",
    );
  }
  if (!identidad.registro) {
    throw new HttpError(
      409,
      "Todavía no tenés una cuenta. Elegí cómo querés registrarte.",
    );
  }

  const registro = validarPerfilRegistro(identidad.registro);
  try {
    return await crearUsuarioGoogle({ ...identidad, registro });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Dos intentos simultáneos pueden encontrar la cuenta recién creada.
      const existente = await buscarUsuarioPorGoogleId(identidad.googleId);
      if (existente) return existente;
      throw new HttpError(
        409,
        "Ya existe una cuenta con ese email. Iniciá sesión con tu método habitual.",
      );
    }
    throw error;
  }
}
