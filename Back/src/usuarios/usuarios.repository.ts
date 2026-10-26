import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import type { PerfilRegistroDto } from "./dto/registro-usuario.dto.js";
import type {
  Usuario,
  UsuarioParaLogin,
  UsuarioPublico,
  UsuarioSesion,
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

// Esta función busca un usuario por su ID y devuelve solo los campos necesarios para la sesión. El select evita que se devuelvan campos sensibles como la contraseña.
export function buscarUsuarioPorId(id: string): Promise<UsuarioSesion | null> {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      estudioId: true,
    },
  });
}
// Esta función busca un usuario por su Google ID y devuelve solo los campos necesarios para la sesión. El select evita que se devuelvan campos sensibles como la contraseña.
export function buscarUsuarioPorGoogleId(
  googleId: string,
): Promise<UsuarioSesion | null> {
  return prisma.usuario.findUnique({
    where: { googleId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      estudioId: true,
    },
  });
}

export function crearUsuarioGoogle(datos: {
  googleId: string;
  email: string;
  nombre: string;
  registro: PerfilRegistroDto;
}): Promise<UsuarioSesion> {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        googleId: datos.googleId,
        email: datos.email,
        nombre: datos.nombre,
        password: null,
        rol: datos.registro.rol,
        nombreArtistico:
          datos.registro.rol === "ARTISTA"
            ? datos.registro.nombreArtistico
            : null,
        emailVerificado: true,
        estilosPrincipales: [],
        metodosPagoAceptados: [],
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estudioId: true,
      },
    });

    if (datos.registro.rol !== "ESTUDIO_ADMIN") return usuario;

    const estudio = await tx.estudio.create({
      data: {
        nombre: datos.registro.nombreEstudio,
        slug: `estudio-${crypto.randomUUID()}`,
        propietarioId: usuario.id,
      },
      select: { id: true },
    });

    return tx.usuario.update({
      where: { id: usuario.id },
      data: { estudioId: estudio.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estudioId: true,
      },
    });
  });
}
