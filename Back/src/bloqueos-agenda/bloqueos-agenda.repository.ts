import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { presentarBloqueo } from "./bloqueos-agenda.entity.js";
export async function listarBloqueosAgenda(a: AmbitoConsultas) {
  const propios = !(a.tipo === "ESTUDIO" && a.administra);
  const bloqueos = await prisma.bloqueoAgenda.findMany({
    where: {
      canceladoAt: null,
      disponibilidad: {
        ambito: a.estudioId || "INDEPENDIENTE",
        ...(propios ? { artistaId: a.usuarioId } : {}),
        artista: { estudioId: a.estudioId, rol: "ARTISTA" },
      },
    },
    include: {
      disponibilidad: {
        select: {
          artista: {
            select: { id: true, nombre: true, nombreArtistico: true },
          },
        },
      },
    },
    orderBy: { inicioAt: "asc" },
  });
  return bloqueos.map((b) => ({
    ...presentarBloqueo(b, a.zonaHoraria),
    artistaId: b.disponibilidad.artista.id,
    artistaNombre:
      b.disponibilidad.artista.nombreArtistico ||
      b.disponibilidad.artista.nombre ||
      "Artista",
  }));
}
export function buscarCruceCita(
  tx: Prisma.TransactionClient,
  artistaId: string,
  inicioAt: Date,
  finAt: Date,
) {
  return tx.cita.findFirst({
    where: {
      artistaId,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      AND: [{ inicioAt: { lt: finAt } }, { finAt: { gt: inicioAt } }],
    },
    select: { inicioAt: true },
  });
}
