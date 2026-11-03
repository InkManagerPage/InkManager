import type { Prisma } from "@prisma/client";
import {
  ambitoDeCuenta,
  type CuentaConsultas,
} from "../solicitudes/solicitudes.ambito.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import {
  detalleDisponibilidad,
  type ArtistaAgenda,
  type DisponibilidadCompleta,
} from "./disponibilidad.entity.js";
export const claveAmbito = (a: AmbitoConsultas) =>
  a.estudioId || "INDEPENDIENTE";
async function bloquearCuenta(tx: Prisma.TransactionClient, id: string) {
  const filas = await tx.$queryRaw<CuentaConsultas[]>`
    SELECT u."id", u."rol"::text AS "rol", u."estudioId",
      u."estadoEnEstudio"::text AS "estadoEnEstudio", u."nombre", u."nombreArtistico",
      u."zonaHoraria", u."email", u."emailVerificado",
      CASE WHEN e."id" IS NULL THEN NULL ELSE jsonb_build_object(
        'id', e."id", 'nombre', e."nombre", 'propietarioId', e."propietarioId", 'zonaHoraria', e."zonaHoraria"
      ) END AS "estudio"
    FROM "Usuario" u LEFT JOIN "Estudio" e ON e."id"=u."estudioId"
    WHERE u."id"=${id} FOR SHARE OF u`;
  return filas[0];
}
export function buscarDisponibilidad(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
  artistaId: string,
) {
  return tx.disponibilidadArtista.findUnique({
    where: { artistaId_ambito: { artistaId, ambito: claveAmbito(a) } },
    include: detalleDisponibilidad,
  });
}
export async function bloquearCalendario(
  tx: Prisma.TransactionClient,
  artistaId: string,
) {
  // Coordina cambios de horarios, bloqueos y reservas del mismo artista.
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`agenda:${artistaId}`})::bigint)`;
}
export async function comprobarZonaActual(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
) {
  const espacio = a.estudioId
    ? await tx.estudio.findUnique({
        where: { id: a.estudioId },
        select: { zonaHoraria: true, propietarioId: true },
      })
    : await tx.usuario.findUnique({
        where: { id: a.usuarioId },
        select: { zonaHoraria: true },
      });
  if (
    a.estudioId &&
    a.administra &&
    (!espacio ||
      !("propietarioId" in espacio) ||
      espacio.propietarioId !== a.usuarioId)
  )
    throw new HttpError(
      403,
      "Solo el titular puede gestionar la agenda del equipo.",
    );
  if (espacio?.zonaHoraria !== a.zonaHoraria)
    throw new HttpError(
      409,
      "La zona horaria cambió. Actualizá la agenda antes de guardar.",
    );
}
export function conAgenda<T>(
  usuarioId: string,
  artistaId: string,
  escritura: boolean,
  operacion: (
    tx: Prisma.TransactionClient,
    artista: ArtistaAgenda,
    disponibilidad: DisponibilidadCompleta | null,
    puedeEditar: boolean,
    ambito: AmbitoConsultas,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      const actor = await bloquearCuenta(tx, usuarioId);
      if (!actor) throw new HttpError(401, "Debés iniciar sesión.");
      const a = ambitoDeCuenta(actor);
      if (actor.rol === "ESTUDIO_ADMIN") {
        if (!a.estudioId || !a.administra)
          throw new HttpError(
            403,
            "Solo el titular puede gestionar la disponibilidad del equipo.",
          );
      } else if (actor.rol !== "ARTISTA" || artistaId !== a.usuarioId)
        throw new HttpError(
          403,
          "Solo podés gestionar tu propia disponibilidad.",
        );
      const artista =
        artistaId === actor.id ? actor : await bloquearCuenta(tx, artistaId);
      if (
        !artista ||
        artista.rol !== "ARTISTA" ||
        artista.estudioId !== a.estudioId
      )
        throw new HttpError(
          404,
          "No encontramos ese artista en tu espacio de trabajo.",
        );
      const puedeEditar =
        actor.rol === "ESTUDIO_ADMIN" ||
        !actor.estudioId ||
        actor.estadoEnEstudio === "ACTIVO";
      if (escritura && !puedeEditar)
        throw new HttpError(
          403,
          "Tu disponibilidad es de solo lectura mientras estés suspendido.",
        );
      if (escritura) await bloquearCalendario(tx, artistaId);
      if (a.estudioId) await comprobarZonaActual(tx, a);
      return operacion(
        tx,
        artista,
        await buscarDisponibilidad(tx, a, artistaId),
        puedeEditar,
        a,
      );
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
export function crearDisponibilidad(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
  artistaId: string,
) {
  return tx.disponibilidadArtista.create({
    data: { artistaId, estudioId: a.estudioId, ambito: claveAmbito(a) },
    include: detalleDisponibilidad,
  });
}
export function citasActivas(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
  artistaId: string,
) {
  return tx.cita.findMany({
    where: {
      artistaId,
      solicitud: a.estudioId
        ? { estudioId: a.estudioId }
        : { estudioId: null, artistaDestinoId: artistaId },
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      finAt: { gt: new Date() },
    },
    select: { id: true, inicioAt: true, finAt: true },
  });
}
export function cambiarZonaCalendario(a: AmbitoConsultas, zonaHoraria: string) {
  return prisma.$transaction(
    async (tx) => {
      if (a.estudioId)
        await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${a.usuarioId} FOR SHARE`;
      else
        await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${a.usuarioId} FOR UPDATE`;
      const actor = await tx.usuario.findUnique({
        where: { id: a.usuarioId },
        select: { rol: true, estudioId: true },
      });
      if (
        !actor ||
        actor.estudioId !== a.estudioId ||
        actor.rol !== (a.estudioId ? "ESTUDIO_ADMIN" : "ARTISTA")
      )
        throw new HttpError(
          403,
          "Tu espacio de trabajo cambió. Actualizá el panel.",
        );
      if (a.estudioId) {
        await tx.$queryRaw`SELECT "id" FROM "Estudio" WHERE "id"=${a.estudioId} FOR UPDATE`;
        if (
          !(await tx.estudio.findFirst({
            where: { id: a.estudioId, propietarioId: a.usuarioId },
            select: { id: true },
          }))
        )
          throw new HttpError(
            403,
            "Solo el titular puede cambiar la zona horaria.",
          );
      }
      await comprobarZonaActual(tx, a);
      if (a.zonaHoraria === zonaHoraria) return;
      const artistas = a.estudioId
        ? await tx.usuario.findMany({
            where: { estudioId: a.estudioId, rol: "ARTISTA" },
            select: { id: true },
            orderBy: { id: "asc" },
          })
        : [{ id: a.usuarioId }];
      for (const artista of artistas) {
        if (artista.id !== a.usuarioId)
          await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${artista.id} FOR SHARE`;
        await bloquearCalendario(tx, artista.id);
      }
      const configuradas = await tx.disponibilidadArtista.findMany({
        where: {
          artistaId: { in: artistas.map((x) => x.id) },
          ambito: claveAmbito(a),
        },
        select: {
          artistaId: true,
          semana: true,
          bloqueos: {
            where: { canceladoAt: null, finAt: { gt: new Date() } },
            take: 1,
            select: { id: true },
          },
        },
      });
      const idsConHorario = configuradas
        .filter((d) => d.semana !== null)
        .map((d) => d.artistaId);
      const futuras = idsConHorario.length
        ? await tx.cita.count({
            where: {
              artistaId: { in: idsConHorario },
              estado: { in: ["PENDIENTE", "CONFIRMADA"] },
              finAt: { gt: new Date() },
            },
          })
        : 0;
      if (futuras || configuradas.some((d) => d.bloqueos.length))
        throw new HttpError(
          409,
          "Resolvé los turnos futuros y quitá los bloqueos futuros antes de cambiar la zona horaria de una agenda configurada.",
        );
      await tx.disponibilidadArtista.updateMany({
        where: {
          artistaId: { in: artistas.map((x) => x.id) },
          ambito: claveAmbito(a),
        },
        data: { version: { increment: 1 } },
      });
      if (a.estudioId)
        await tx.estudio.update({
          where: { id: a.estudioId },
          data: { zonaHoraria },
        });
      else
        await tx.usuario.update({
          where: { id: a.usuarioId },
          data: { zonaHoraria },
        });
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
