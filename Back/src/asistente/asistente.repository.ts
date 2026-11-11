import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { configuracionInicial, validarConfiguracion } from "./configuracion.js";

export async function leerConfiguracionAsistente(
  where: Prisma.ConfiguracionAsistenteWhereUniqueInput,
) {
  const guardada = await prisma.configuracionAsistente.findUnique({
    where,
    select: { datos: true },
  });
  return guardada ? validarConfiguracion(guardada.datos) : configuracionInicial;
}
