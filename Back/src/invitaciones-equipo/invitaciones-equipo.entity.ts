import type { Prisma } from "@prisma/client";
export const detalleInvitacion = {
  estudio: { select: { nombre: true } },
} satisfies Prisma.InvitacionEquipoInclude;
export type InvitacionCompleta = Prisma.InvitacionEquipoGetPayload<{
  include: typeof detalleInvitacion;
}>;
export function presentarInvitacion(i: InvitacionCompleta, ahora = new Date()) {
  return {
    id: i.id,
    estudioId: i.estudioId,
    estudioNombre: i.estudio.nombre,
    email: i.email,
    estado:
      i.estado === "PENDIENTE" && i.expiraAt <= ahora ? "VENCIDA" : i.estado,
    expiraAt: i.expiraAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    estadoEnvio: i.estadoEnvio,
    enviadaAt: i.enviadaAt?.toISOString() || null,
    version: i.version,
    puedeReenviar:
      i.estado === "PENDIENTE" &&
      i.expiraAt > ahora &&
      ahora.getTime() - i.ultimoIntentoAt.getTime() >= 60000,
  };
}
