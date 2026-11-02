import { prisma } from "../config/prisma.js";
import { detalleInvitacion } from "./invitaciones-equipo.entity.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
export function listarInvitaciones(a: AmbitoConsultas) {
  const titular = a.tipo === "ESTUDIO" && a.administra;
  if (!titular && !a.emailVerificado) return Promise.resolve([]);
  return prisma.invitacionEquipo.findMany({
    where: titular
      ? { estudioId: a.estudioId! }
      : { email: a.email, estado: "PENDIENTE", expiraAt: { gt: new Date() } },
    include: detalleInvitacion,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export function guardarResultadoEnvio(
  id: string,
  version: number,
  enviada: boolean,
) {
  return prisma.invitacionEquipo.updateMany({
    where: { id, version, estado: "PENDIENTE" },
    data: {
      estadoEnvio: enviada ? "ENVIADA" : "ERROR",
      ...(enviada ? { enviadaAt: new Date() } : {}),
    },
  });
}
