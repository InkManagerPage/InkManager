import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { randomUUID } from "node:crypto";
import { periodoPlanVigente, tieneRenovacion, vencerPlanesSinRenovacion } from "../pagos/acceso-plan.js";

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
      estudioId: true,
      suspendidoAt: true,
      createdAt: true,
    },
  });
}

export async function listarSuscripciones(q: string, pagina: number) {
  const ahora = new Date();
  const filas = await prisma.suscripcion.findMany({
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
      bonificada: true,
      mercadoPagoId: true,
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
  return filas.map(({ mercadoPagoId, ...fila }) => ({
    ...fila,
    estado: fila.bonificada && fila.estado === "ACTIVA" && fila.periodoHasta && fila.periodoHasta <= ahora
      ? "VENCIDA" : fila.estado,
    renovacion: tieneRenovacion({ ...fila, mercadoPagoId }),
  }));
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

export async function otorgarPlanBonificado(autorId: string, cuentaId: string, hasta: Date | null, motivo: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${cuentaId} FOR UPDATE`;
    const cuenta = await tx.usuario.findUnique({
      where: { id: cuentaId },
      select: { rol: true, estudioId: true, suspendidoAt: true, estudio: { select: { propietarioId: true } } },
    });
    if (!cuenta) throw new HttpError(404, "No encontramos la cuenta.");
    const plan = cuenta.rol === "ARTISTA" && !cuenta.estudioId ? "INDIVIDUAL" :
      cuenta.rol === "ESTUDIO_ADMIN" && cuenta.estudio?.propietarioId === cuentaId ? "ESTUDIO" : null;
    if (!plan || cuenta.suspendidoAt)
      throw new HttpError(409, "Elegí un artista independiente o titular de estudio con su cuenta habilitada.");
    const ahora = new Date();
    await vencerPlanesSinRenovacion(tx, cuentaId, ahora);
    const existente = await tx.suscripcion.findFirst({
      where: { usuarioId: cuentaId, OR: [
        { estado: { in: ["PENDIENTE", "ACTIVA", "PAUSADA"] } }, periodoPlanVigente(ahora),
      ] },
      select: { id: true, plan: true, estado: true, bonificada: true },
    });
    if (existente && (!existente.bonificada || existente.estado !== "ACTIVA" || existente.plan !== plan))
      throw new HttpError(409, "La cuenta ya tiene un plan vigente o un pago en curso.");
    const id = randomUUID();
    const otorgada = existente
      ? await tx.suscripcion.update({ where: { id: existente.id }, data: { periodoHasta: hasta }, select: { id: true, plan: true } })
      : await tx.suscripcion.create({
          data: { id, referenciaExterna: id, usuarioId: cuentaId, plan, ciclo: "MENSUAL",
            estado: "ACTIVA", monto: 0, bonificada: true, periodoHasta: hasta },
          select: { id: true, plan: true },
        });
    await tx.accionAdministrativa.create({
      data: { autorId, cuentaId, accion: existente ? "ACTUALIZAR_PLAN_BONIFICADO" : "OTORGAR_PLAN_BONIFICADO", motivo },
    });
    return otorgada;
  }).catch(error => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new HttpError(409, "La cuenta ya tiene un plan o un pago en curso. Actualizá el listado.");
    throw error;
  });
}

export async function revocarPlanBonificado(autorId: string, suscripcionId: string, motivo: string) {
  await prisma.$transaction(async tx => {
    const ahora = new Date();
    const bonificacion = await tx.suscripcion.findFirst({
      where: { id: suscripcionId, bonificada: true, estado: "ACTIVA", ...periodoPlanVigente(ahora) },
      select: { usuarioId: true },
    });
    if (!bonificacion) throw new HttpError(409, "El plan bonificado ya no está vigente.");
    const { count } = await tx.suscripcion.updateMany({
      where: { id: suscripcionId, bonificada: true, estado: "ACTIVA" },
      data: { estado: "CANCELADA", canceladaAt: ahora, periodoHasta: ahora },
    });
    if (!count) throw new HttpError(409, "El plan bonificado ya no está vigente.");
    await tx.accionAdministrativa.create({
      data: { autorId, cuentaId: bonificacion.usuarioId, accion: "REVOCAR_PLAN_BONIFICADO", motivo },
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
