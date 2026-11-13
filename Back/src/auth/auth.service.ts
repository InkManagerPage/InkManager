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
import { prisma } from "../config/prisma.js";

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

  const [, usuario] = await Promise.all([
    validarSesion(sesionId, usuarioId),
    buscarUsuarioPorId(usuarioId),
  ]);

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

export async function eliminarCuenta(usuarioId: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true },
  });

  if (!usuario) {
    throw new HttpError(404, "No encontramos la cuenta.");
  }

  const sufijoAnonimo = crypto.randomUUID().slice(0, 8);

  await prisma.$transaction(async (tx) => {
    // 1. Revocar todas las sesiones del usuario
    await tx.sesion.updateMany({
      where: { usuarioId, revocadaAt: null },
      data: { revocadaAt: new Date() },
    });

    // 2. Anonimizar y marcar como suspendido (soft delete)
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        email: `eliminado_${sufijoAnonimo}@anonimo.inkmanager.com`,
        nombre: "Usuario eliminado",
        nombreArtistico: null,
        telefono: null,
        password: null,
        googleId: null,
        suspendidoAt: new Date(),
      },
    });
  });
}
