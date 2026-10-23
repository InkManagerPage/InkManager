import type { Usuario as UsuarioPrisma } from "@prisma/client";

// Prisma genera este tipo a partir del modelo Usuario de schema.prisma.
export type Usuario = UsuarioPrisma;

export type UsuarioPublico = Pick<
  Usuario,
  | "id"
  | "email"
  | "nombre"
  | "nombreArtistico"
  | "rol"
  | "estadoVerificacion"
  | "emailVerificado"
  | "createdAt"
>;

// Tipo para el login, que incluye solo los campos necesarios para la autenticación.
export type UsuarioParaLogin = Pick<
  Usuario,
  "id" | "nombre" | "email" | "password" | "rol" | "estudioId"
>;

export type UsuarioSesion = Pick<
  Usuario,
  "id" | "nombre" | "email" | "rol" | "estudioId"
>;
