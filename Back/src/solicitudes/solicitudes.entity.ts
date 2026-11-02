import type { Prisma } from "@prisma/client";

export interface AmbitoConsultas {
  usuarioId: string;
  tipo: "ESTUDIO" | "INDEPENDIENTE";
  estudioId: string | null;
  nombre: string;
  administra: boolean;
  puedeProponer: boolean;
  zonaHoraria: string;
  email: string;
  emailVerificado: boolean;
}
export const detalleSolicitud = {
  contacto: true,
  cliente: {
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      ciudad: true,
    },
  },
  cotizaciones: {
    include: {
      artista: {
        select: {
          id: true,
          nombre: true,
          nombreArtistico: true,
          estudioId: true,
          estadoEnEstudio: true,
          rol: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SolicitudInclude;
export type SolicitudCompleta = Prisma.SolicitudGetPayload<{
  include: typeof detalleSolicitud;
}>;
export type EstadoPanelConsulta =
  "ABIERTA" | "POR_ASIGNAR" | "ELECCION_CLIENTE" | "ASIGNADA" | "ARCHIVADA";

export function estadoPanel(
  estado: SolicitudCompleta["estado"],
): EstadoPanelConsulta {
  if (estado === "PENDIENTE" || estado === "EN_COTIZACION") return "ABIERTA";
  if (estado === "ACEPTADO") return "ASIGNADA";
  if (estado === "CANCELADO") return "ARCHIVADA";
  return estado;
}
export function presentarSolicitud(
  s: SolicitudCompleta,
  ambito: AmbitoConsultas,
) {
  return {
    id: s.id,
    clienteId: s.contactoId || s.clienteId || "",
    titulo: s.titulo || s.descripcion?.slice(0, 80) || "Consulta de tatuaje",
    descripcion: s.descripcion || "",
    estilo: s.estilo,
    zona: s.subZona,
    tamano: s.tamano || "Sin indicar",
    color: s.tipoColor === "COLOR" ? "Color" : "Negro y gris",
    origen: s.estudioId ? "Estudio" : "Directa",
    canal: s.canal,
    fecha: s.createdAt.toISOString(),
    estado: estadoPanel(s.estado),
    notas: s.notas,
    referencia: s.referencias[0] || "",
    referencias: s.referencias,
    imagenZonaMarcada: s.imagenZonaMarcada,
    modeloCorporal: s.generoCuerpo,
    zonaGeneral: s.zonaGeneral,
    cierre: s.cierrePropuestasAt?.toISOString() || null,
    cerradaEn: s.cerradaAt?.toISOString() || null,
    artistaId: s.artistaAsignadoId,
    asignadaPor: s.asignadaPor,
    version: s.version,
    propuestas: s.cotizaciones
      .filter((c) => ambito.administra || c.artistaId === ambito.usuarioId)
      .map((c) => ({
        id: c.id,
        artistaId: c.artistaId,
        importe: Number(c.monto),
        sena: Number(c.montoSena),
        detalle: c.mensaje || "",
        validez: c.validaHasta?.toISOString().slice(0, 10) || "",
        boceto: c.bocetoUrl || "",
        fecha: c.updatedAt.toISOString(),
      })),
  };
}
