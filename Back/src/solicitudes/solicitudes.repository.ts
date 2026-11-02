import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";
import type {
  AmbitoConsultas,
  SolicitudCompleta,
} from "./solicitudes.entity.js";
import { detalleSolicitud } from "./solicitudes.entity.js";
import { HttpError } from "../errors/http-error.js";

export function buscarCuenta(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      rol: true,
      nombre: true,
      nombreArtistico: true,
      estudioId: true,
      estadoEnEstudio: true,
      zonaHoraria: true,
      email: true,
      emailVerificado: true,
      estudio: {
        select: {
          id: true,
          nombre: true,
          propietarioId: true,
          zonaHoraria: true,
        },
      },
    },
  });
}
export function filtroAmbito(a: AmbitoConsultas): Prisma.SolicitudWhereInput {
  if (a.tipo === "INDEPENDIENTE")
    return { artistaDestinoId: a.usuarioId, estudioId: null };
  return {
    estudioId: a.estudioId,
    ...(!a.administra && !a.puedeProponer
      ? { artistaAsignadoId: a.usuarioId }
      : {}),
  };
}
export function listarSolicitudes(a: AmbitoConsultas) {
  return prisma.solicitud.findMany({
    where: filtroAmbito(a),
    include: detalleSolicitud,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
export function listarEquipo(a: AmbitoConsultas) {
  return prisma.usuario.findMany({
    where:
      a.tipo === "ESTUDIO"
        ? { estudioId: a.estudioId, rol: "ARTISTA" }
        : { id: a.usuarioId, rol: "ARTISTA" },
    select: {
      id: true,
      nombre: true,
      nombreArtistico: true,
      email: true,
      estilosPrincipales: true,
      estadoEnEstudio: true,
      versionEquipo: true,
      _count: {
        select: {
          citas: {
            where: {
              solicitud: { estudioId: a.estudioId },
              estado: { in: ["PENDIENTE", "CONFIRMADA"] },
            },
          },
          solicitudesAsignadas: {
            where: {
              estudioId: a.estudioId,
              estado: { notIn: ["ARCHIVADA", "CANCELADO"] },
            },
          },
        },
      },
    },
    orderBy: { nombre: "asc" },
  });
}
export async function mutarSolicitud<T>(
  a: AmbitoConsultas,
  id: string,
  operacion: (
    tx: Prisma.TransactionClient,
    solicitud: SolicitudCompleta,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // El bloqueo también evita que se quite la membresía durante una propuesta.
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${a.usuarioId} FOR SHARE`;
      const usuario = await tx.usuario.findUnique({
        where: { id: a.usuarioId },
        select: { rol: true, estudioId: true, estadoEnEstudio: true },
      });
      if (
        !usuario ||
        (a.tipo === "INDEPENDIENTE" &&
          (usuario.rol !== "ARTISTA" || usuario.estudioId)) ||
        (a.tipo === "ESTUDIO" && usuario.estudioId !== a.estudioId)
      )
        throw new HttpError(
          403,
          "Tu modalidad de trabajo cambió. Volvé a cargar el panel.",
        );
      if (a.tipo === "ESTUDIO") {
        if (a.administra) {
          const titular =
            usuario.rol === "ESTUDIO_ADMIN" &&
            (await tx.estudio.findFirst({
              where: { id: a.estudioId!, propietarioId: a.usuarioId },
              select: { id: true },
            }));
          if (!titular)
            throw new HttpError(
              403,
              "No tenés permisos para administrar este estudio.",
            );
        } else if (usuario.rol !== "ARTISTA")
          throw new HttpError(403, "Tu rol cambió. Volvé a cargar el panel.");
        else if (usuario.estadoEnEstudio !== "ACTIVO")
          throw new HttpError(
            403,
            "Solo podés consultar el panel mientras estés suspendido.",
          );
      }
      const visible = await tx.solicitud.findFirst({
        where: { ...filtroAmbito(a), id },
        select: { id: true },
      });
      if (!visible) throw new HttpError(404, "No encontramos esa consulta.");
      await tx.$queryRaw`SELECT "id" FROM "Solicitud" WHERE "id"=${id} FOR UPDATE`;
      const solicitud = await tx.solicitud.findUniqueOrThrow({
        where: { id },
        include: detalleSolicitud,
      });
      return operacion(tx, solicitud);
    },
    { timeout: 20000, maxWait: 10000 },
  );
}

export async function cerrarVencidasDelAmbito(a: AmbitoConsultas) {
  const filtro =
    a.tipo === "INDEPENDIENTE"
      ? Prisma.sql`s."artistaDestinoId"=${a.usuarioId} AND s."estudioId" IS NULL`
      : Prisma.sql`s."estudioId"=${a.estudioId}`;
  // Un lote evita abrir una transacción remota por cada consulta vencida.
  await prisma.$executeRaw(Prisma.sql`
    WITH vencidas AS (
      SELECT s."id" FROM "Solicitud" s
      WHERE ${filtro} AND s."estado" IN ('PENDIENTE','EN_COTIZACION') AND s."cierrePropuestasAt"<=CURRENT_TIMESTAMP
      ORDER BY s."cierrePropuestasAt",s."id" LIMIT 200 FOR UPDATE SKIP LOCKED
    ), opciones AS (
      SELECT s."id",count(c."id")::int AS cantidad,min(c."artistaId") AS artista
      FROM vencidas v JOIN "Solicitud" s ON s."id"=v."id"
      LEFT JOIN "Cotizacion" c ON c."solicitudId"=s."id"
        AND (c."validaHasta" IS NULL OR c."validaHasta">=CURRENT_TIMESTAMP)
        AND EXISTS (SELECT 1 FROM "Usuario" u WHERE u."id"=c."artistaId" AND u."rol"='ARTISTA'
          AND ((s."estudioId" IS NOT NULL AND u."estudioId"=s."estudioId" AND u."estadoEnEstudio"='ACTIVO')
          OR (s."estudioId" IS NULL AND u."id"=s."artistaDestinoId" AND u."estudioId" IS NULL)))
      GROUP BY s."id"
    )
    UPDATE "Solicitud" s SET
      "estado"=(CASE WHEN o.cantidad=1 THEN 'ASIGNADA' WHEN o.cantidad>1 THEN 'ELECCION_CLIENTE' ELSE 'POR_ASIGNAR' END)::"EstadoSolicitud",
      "artistaAsignadoId"=CASE WHEN o.cantidad=1 THEN o.artista ELSE NULL END,
      "asignadaPor"=CASE WHEN o.cantidad=1 THEN 'UNICA_PROPUESTA' ELSE NULL END,
      "cerradaAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP,"version"=s."version"+1
    FROM opciones o WHERE s."id"=o."id"
  `);
}
