import type { Prisma } from "@prisma/client";
import type { DatosContacto } from "./contactos.validation.js";

export async function obtenerOCrearContacto(
  tx: Prisma.TransactionClient,
  ambito: { estudioId: string } | { artistaId: string },
  datos: DatosContacto,
) {
  // Un envío público no debe cambiar los datos de una ficha existente.
  await tx.contacto.createMany({ data: { ...datos, ...ambito }, skipDuplicates: true });
  return tx.contacto.findFirstOrThrow({
    where: { ...ambito, email: datos.email },
    select: { id: true },
  });
}
