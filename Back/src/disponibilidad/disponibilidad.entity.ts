import type { Prisma } from "@prisma/client";
import { presentarBloqueo } from "../bloqueos-agenda/bloqueos-agenda.entity.js";
export interface RangoHorario {
  desde: string;
  hasta: string;
}
export interface DiaDisponible {
  dia: number;
  rangos: RangoHorario[];
}
export type SemanaDisponible = DiaDisponible[];
export const detalleDisponibilidad = {
  bloqueos: { where: { canceladoAt: null }, orderBy: { inicioAt: "asc" } },
} satisfies Prisma.DisponibilidadArtistaInclude;
export type DisponibilidadCompleta = Prisma.DisponibilidadArtistaGetPayload<{
  include: typeof detalleDisponibilidad;
}>;
export interface ArtistaAgenda {
  id: string;
  nombre: string | null;
  nombreArtistico: string | null;
  estadoEnEstudio: string;
}
export function presentarDisponibilidad(
  d: DisponibilidadCompleta | null,
  artista: ArtistaAgenda,
  zonaHoraria: string,
  puedeEditar: boolean,
) {
  return {
    artista: {
      id: artista.id,
      nombre: artista.nombreArtistico || artista.nombre || "Artista",
    },
    zonaHoraria,
    puedeEditar,
    version: d?.version || 0,
    semana: (d?.semana || null) as SemanaDisponible | null,
    bloqueos: (d?.bloqueos || []).map((b) => presentarBloqueo(b, zonaHoraria)),
  };
}
