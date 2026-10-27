import { prisma } from "../config/prisma.js";
import type { TipoTokenCuenta } from "./tokens-cuenta.entity.js";
import { HttpError } from "../errors/http-error.js";

export function buscarDestinatario(email: string) {
  return prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      nombre: true,
      emailVerificado: true,
    },
  });
}

export function guardarToken(
  usuarioId: string,
  tipo: TipoTokenCuenta,
  tokenHash: string,
  expiraAt: Date,
) {
  return prisma.tokenCuenta.upsert({
    where: { usuarioId_tipo: { usuarioId, tipo } },
    create: { usuarioId, tipo, tokenHash, expiraAt },
    update: { tokenHash, expiraAt, usadoAt: null, createdAt: new Date() },
  });
}

export function buscarToken(tokenHash: string) {
  return prisma.tokenCuenta.findUnique({
    where: { tokenHash },
  });
}

export function buscarUltimoToken(usuarioId: string, tipo: TipoTokenCuenta) {
  return prisma.tokenCuenta.findUnique({
    where: { usuarioId_tipo: { usuarioId, tipo } },
  });
}

export async function consumirToken(
  tokenHash: string,
  tipo: TipoTokenCuenta,
  passwordHash?: string,
) {
  return prisma.$transaction(async (tx) => {
    const ahora = new Date();
    // La actualización condicional impide usar dos veces el mismo enlace, incluso en simultáneo.
    const actualizado = await tx.tokenCuenta.updateMany({
      where: { tokenHash, tipo, usadoAt: null, expiraAt: { gt: ahora } },
      data: { usadoAt: ahora },
    });
    if (actualizado.count !== 1)
      throw new HttpError(
        400,
        "El enlace no es válido o ya venció. Solicitá uno nuevo.",
      );
    const token = await tx.tokenCuenta.findUniqueOrThrow({
      where: { tokenHash },
    });
    const usuario = await tx.usuario.update({
      where: { id: token.usuarioId },
      data: {
        emailVerificado: true,
        tokenVerificacionEmail: null,
        ...(passwordHash ? { password: passwordHash } : {}),
      },
      select: { id: true, email: true, nombre: true },
    });
    if (passwordHash) {
      await tx.sesion.updateMany({
        where: { usuarioId: usuario.id, revocadaAt: null },
        data: { revocadaAt: ahora },
      });
    }
    return usuario;
  });
}
