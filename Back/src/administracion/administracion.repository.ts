import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";

export async function resumenAdministrativo(desde: Date, hasta: Date) {
  const periodo = { gte: desde, lt: hasta };
  const [
    altas,
    estudios,
    consultas,
    presupuestos,
    turnos,
    suscripciones,
    cobros,
    fallidos,
  ] = await Promise.all([
    prisma.usuario.groupBy({
      by: ["rol"],
      where: { createdAt: periodo },
      _count: { _all: true },
    }),
    prisma.estudio.count({ where: { createdAt: periodo } }),
    prisma.solicitud.count({ where: { createdAt: periodo } }),
    prisma.cotizacion.count({ where: { createdAt: periodo } }),
    prisma.cita.count({
      where: { estado: "COMPLETADA", completadaAt: periodo },
    }),
    prisma.suscripcion.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.pagoSuscripcion.groupBy({
      by: ["moneda"],
      where: { estado: "APROBADO", aprobadoAt: periodo },
      _sum: { monto: true },
    }),
    prisma.pagoSuscripcion.count({
      where: { estado: "RECHAZADO", createdAt: periodo },
    }),
  ]);
  return {
    altas,
    estudios,
    consultas,
    presupuestos,
    turnos,
    suscripciones,
    fallidos,
    cobros: cobros
      .filter((c) => c.moneda && c._sum.monto !== null)
      .map((c) => ({ moneda: c.moneda!, monto: Number(c._sum.monto) })),
  };
}

export async function listarCuentas(q: string, pagina: number) {
  const where: Prisma.UsuarioWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { nombre: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  return prisma.usuario.findMany({
    where,
    skip: (pagina - 1) * 25,
    take: 26,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      suspendidoAt: true,
      createdAt: true,
    },
  });
}

export async function listarSuscripciones(q: string, pagina: number) {
  return prisma.suscripcion.findMany({
    where: q
      ? { usuario: { email: { contains: q, mode: "insensitive" } } }
      : {},
    skip: (pagina - 1) * 25,
    take: 26,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      plan: true,
      ciclo: true,
      estado: true,
      monto: true,
      moneda: true,
      proximoCobroAt: true,
      periodoHasta: true,
      usuario: { select: { email: true } },
      pagos: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { estado: true, createdAt: true },
      },
    },
  });
}

export async function cambiarEstadoCuenta(
  autorId: string,
  cuentaId: string,
  suspendida: boolean,
  motivo: string,
) {
  await prisma.$transaction(async (tx) => {
    const ahora = new Date();
    const { count } = await tx.usuario.updateMany({
      where: {
        id: cuentaId,
        rol: { not: "SUPERADMIN" },
        suspendidoAt: suspendida ? null : { not: null },
      },
      data: { suspendidoAt: suspendida ? ahora : null },
    });
    if (!count)
      throw new HttpError(
        409,
        "La cuenta no admite ese cambio. Actualizá el listado.",
      );
    if (suspendida)
      await tx.sesion.updateMany({
        where: { usuarioId: cuentaId, revocadaAt: null },
        data: { revocadaAt: ahora },
      });
    await tx.accionAdministrativa.create({
      data: {
        autorId,
        cuentaId,
        accion: suspendida ? "SUSPENDER_CUENTA" : "REACTIVAR_CUENTA",
        motivo,
      },
    });
  });
}

export function listarAcciones() {
  return prisma.accionAdministrativa.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      accion: true,
      motivo: true,
      createdAt: true,
      autor: { select: { email: true } },
      cuenta: { select: { email: true } },
    },
  });
}
