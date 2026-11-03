import { DateTime } from "luxon";
import type { Prisma } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import {
  objetoEntrada,
  validarIdConsulta,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import {
  presentarDisponibilidad,
  type SemanaDisponible,
} from "./disponibilidad.entity.js";
import {
  validarSemana,
  horarioPermitido,
  comprobarVersionDisponibilidad,
} from "./disponibilidad.validation.js";
import * as repo from "./disponibilidad.repository.js";
export async function obtenerDisponibilidad(
  usuarioId: string,
  identificador: unknown,
) {
  const id = validarIdConsulta(identificador);
  return repo.conAgenda(
    usuarioId,
    id,
    false,
    async (_tx, artista, d, puedeEditar, a) =>
      presentarDisponibilidad(d, artista, a.zonaHoraria, puedeEditar),
  );
}
export async function guardarDisponibilidad(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const id = validarIdConsulta(identificador),
    b = objetoEntrada(entrada),
    version = validarVersion(b),
    semana = validarSemana(b.semana);
  return repo.conAgenda(
    usuarioId,
    id,
    true,
    async (tx, artista, d, puedeEditar, a) => {
      comprobarVersionDisponibilidad(d?.version || 0, version);
      const incompatibles = (await repo.citasActivas(tx, a, id)).filter(
        (c) => !horarioPermitido(semana, c.inicioAt, c.finAt, a.zonaHoraria),
      );
      if (incompatibles.length) {
        const ejemplo = DateTime.fromJSDate(incompatibles[0]!.inicioAt)
          .setZone(a.zonaHoraria)
          .toFormat("dd/MM/yyyy HH:mm");
        throw new HttpError(
          409,
          `Hay ${incompatibles.length} turnos que quedarían fuera de horario, por ejemplo el ${ejemplo}. Reprogramalos o cancelalos antes de cambiar la disponibilidad.`,
        );
      }
      const raiz = d || (await repo.crearDisponibilidad(tx, a, id));
      const actualizada = await tx.disponibilidadArtista.update({
        where: { id: raiz.id },
        data: {
          semana: semana as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      return presentarDisponibilidad(
        { ...actualizada, bloqueos: raiz.bloqueos },
        artista,
        a.zonaHoraria,
        puedeEditar,
      );
    },
  );
}
export async function comprobarReservaDisponible(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
  artistaId: string,
  inicioAt: Date,
  finAt: Date,
) {
  await repo.bloquearCalendario(tx, artistaId);
  await repo.comprobarZonaActual(tx, a);
  const d = await repo.buscarDisponibilidad(tx, a, artistaId);
  if (!d?.semana)
    throw new HttpError(
      409,
      "El artista todavía no configuró sus horarios. Revisá Disponibilidad antes de agendar.",
    );
  if (
    !horarioPermitido(
      d.semana as unknown as SemanaDisponible,
      inicioAt,
      finAt,
      a.zonaHoraria,
    )
  )
    throw new HttpError(
      409,
      "El turno queda fuera de los horarios de atención del artista.",
    );
  if (d.bloqueos.some((b) => b.inicioAt < finAt && b.finAt > inicioAt))
    throw new HttpError(
      409,
      "El artista tiene un bloqueo en ese horario. Elegí otra fecha u horario.",
    );
}
