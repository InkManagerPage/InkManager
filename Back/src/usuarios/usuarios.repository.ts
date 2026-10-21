import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type {
  Usuario,
  UsuarioParaLogin,
  UsuarioPublico,
} from "./usuarios.entity.js";

export function buscarUsuarioPorEmail(
  email: string,
): Promise<Pick<Usuario, "id"> | null> {
  return prisma.usuario.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
}

export function crearUsuario(
  data: Prisma.UsuarioCreateInput,
  estudio?: { nombre: string; slug: string },
): Promise<UsuarioPublico> {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        nombreArtistico: true,
        rol: true,
        estadoVerificacion: true,
        emailVerificado: true,
        createdAt: true,
      },
    });

    if (estudio) {
      const nuevoEstudio = await tx.estudio.create({
        data: {
          nombre: estudio.nombre,
          slug: estudio.slug,
          propietarioId: usuario.id,
        },
        select: { id: true },
      });

      await tx.usuario.update({
        where: { id: usuario.id },
        data: { estudioId: nuevoEstudio.id },
      });
    }

    return usuario;
  });
}

export function buscarUsuarioPorToken(
  token: string,
): Promise<Pick<Usuario, "id"> | null> {
  return prisma.usuario.findFirst({
    where: { tokenVerificacionEmail: token },
    select: { id: true },
  });
}

export function marcarEmailVerificado(
  id: string,
): Promise<Pick<Usuario, "id">> {
  return prisma.usuario.update({
    where: { id },
    data: { emailVerificado: true, tokenVerificacionEmail: null },
    select: { id: true },
  });
}

export function buscarUsuarioParaLogin(
  email: string,
): Promise<UsuarioParaLogin | null> {
  return prisma.usuario.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      password: true,
      rol: true,
      estudioId: true,
    },
  });
}
