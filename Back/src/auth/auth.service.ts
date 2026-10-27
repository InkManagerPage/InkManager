import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { HttpError } from "../errors/http-error.js";
import {
  buscarUsuarioParaLogin,
  buscarUsuarioPorId,
} from "../usuarios/usuarios.repository.js";
import { validarLogin } from "./auth.validation.js";
import { crearToken, verificarToken } from "./auth.tokens.js";
import { abrirSesion, validarSesion } from "../sesiones/sesiones.service.js";
import { revocarSesion } from "../sesiones/sesiones.repository.js";

const hashAlternativo = bcrypt.hashSync(crypto.randomUUID(), 12);

export async function validarCredenciales(entrada: unknown) {
  const datos = validarLogin(entrada);
  const usuario = await buscarUsuarioParaLogin(datos.email);

  const passwordCorrecta = await bcrypt.compare(
    datos.password,
    usuario?.password ?? hashAlternativo,
  );

  if (!usuario || !passwordCorrecta) {
    throw new HttpError(401, "Email o contraseña incorrectos.");
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    estudioId: usuario.estudioId,
  };
}

export async function iniciarSesion(entrada: unknown) {
  const usuario = await validarCredenciales(entrada);
  const sesion = await abrirSesion(usuario.id);
  const token = crearToken(usuario.id, sesion.id);

  return { usuario, token };
}
export async function obtenerUsuarioSesion(token: unknown) {
  if (typeof token !== "string" || token.length === 0) {
    throw new HttpError(401, "Debés iniciar sesión.");
  }

  const { usuarioId, sesionId } = verificarToken(token);

  await validarSesion(sesionId, usuarioId);

  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario) {
    throw new HttpError(401, "Sesión inválida.");
  }

  return usuario;
}

export async function cerrarSesion(token: unknown): Promise<void> {
  if (typeof token !== "string" || token.length === 0) {
    return;
  }

  try {
    const { usuarioId, sesionId } = verificarToken(token);

    await revocarSesion(sesionId, usuarioId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return;
    }

    throw error;
  }
}
