import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { periodoPlanVigente, planIndividualVigente } from "../pagos/acceso-plan.js";

export const trabajoPublicado = {
  estado: "PUBLICADO",
  url: { not: "" },
  descripcion: { not: "" },
  estilos: { isEmpty: false },
} satisfies Prisma.FotoGaleriaWhereInput;
export const artistaVisible = {
  rol: "ARTISTA",
  suspendidoAt: null,
  nombreArtistico: { not: null, notIn: [""] },
  biografia: { not: null, notIn: [""] },
  ciudad: { not: null, notIn: [""] },
  ciudadId: { not: null },
  fotoPerfil: { not: null, notIn: [""] },
  estilosPrincipales: { isEmpty: false },
  galeria: { some: trabajoPublicado },
} satisfies Prisma.UsuarioWhereInput;

export const camposArtistaPublico = {
  id: true,
  nombreArtistico: true,
  biografia: true,
  ciudad: true,
  ciudadId: true,
  estilosPrincipales: true,
  fotoPerfil: true,
  estudioId: true,
  estadoVerificacion: true,
  createdAt: true,
} as const;

export function consultarCatalogo() {
  return prisma.usuario.findMany({
    where: artistaVisible,
    select: {
      ...camposArtistaPublico,
      estadoEnEstudio: true,
      estudio: { select: { slug: true, propietario: { select: {
        rol: true, suspendidoAt: true,
        suscripciones: { where: { plan: "ESTUDIO", ...periodoPlanVigente() }, take: 1, select: { id: true } },
      } } } },
      suscripciones: { where: planIndividualVigente(), take: 1, select: { id: true } },
      galeria: {
        where: trabajoPublicado,
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          id: true,
          url: true,
          descripcion: true,
          estilos: true,
          createdAt: true,
        },
      },
    },
    orderBy: { nombreArtistico: "asc" },
    take: 100,
  });
}
