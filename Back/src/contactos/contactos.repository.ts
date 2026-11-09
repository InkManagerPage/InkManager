import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export type PrismaContactoClient = Pick<
  Prisma.TransactionClient,
  "contacto"
>;

export function obtenerOCrearContacto(
  datos: {
    estudioId: string;
    nombre: string;
    email: string;
    telefono: string | null;
    ciudad: string | null;
  },
  client: PrismaContactoClient = prisma,
) {
  return client.contacto.upsert({
    where: {
      estudioId_email: {
        estudioId: datos.estudioId,
        email: datos.email,
      },
    },
    create: {
      estudioId: datos.estudioId,
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      ciudad: datos.ciudad,
    },
    update: {
      nombre: datos.nombre,
      telefono: datos.telefono,
      ciudad: datos.ciudad,
    },
  });
}
