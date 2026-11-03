import type { Prisma } from "@prisma/client";

export const cuentaEquipo = {
  id: true,
  email: true,
  emailVerificado: true,
  rol: true,
  estudioId: true,
  estadoEnEstudio: true,
  versionEquipo: true,
  zonaHoraria: true,
} satisfies Prisma.UsuarioSelect;
export type CuentaEquipo = Prisma.UsuarioGetPayload<{
  select: typeof cuentaEquipo;
}>;
export interface PendientesEquipo {
  turnos: number;
  consultas: number;
}
