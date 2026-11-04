import { DateTime } from "luxon";
import { HttpError } from "../errors/http-error.js";
import {
  objetoEntrada,
  validarIdConsulta,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import {
  conAgenda,
  crearDisponibilidad,
} from "../disponibilidad/disponibilidad.repository.js";
import { presentarDisponibilidad } from "../disponibilidad/disponibilidad.entity.js";
import { comprobarVersionDisponibilidad } from "../disponibilidad/disponibilidad.validation.js";
import { validarBloqueo } from "./bloqueos-agenda.validation.js";
import { buscarCruceCita } from "./bloqueos-agenda.repository.js";
export async function guardarBloqueo(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
  bloqueoId?: unknown,
) {
  const artistaId = validarIdConsulta(identificador),
    id = bloqueoId === undefined ? undefined : validarIdConsulta(bloqueoId),
    b = objetoEntrada(entrada),
    version = validarVersion(b);
  return conAgenda(
    usuarioId,
    artistaId,
    true,
    async (tx, artista, d, puedeEditar, a) => {
      const datos = validarBloqueo(b, a.zonaHoraria);
      comprobarVersionDisponibilidad(d?.version || 0, version);
      if (id && !d?.bloqueos.some((x) => x.id === id))
        throw new HttpError(404, "No encontramos ese bloqueo en esta agenda.");
      const cruce = await buscarCruceCita(
        tx,
        artistaId,
        datos.inicioAt,
        datos.finAt,
      );
      if (cruce)
        throw new HttpError(
          409,
          `Hay un turno el ${DateTime.fromJSDate(cruce.inicioAt).setZone(a.zonaHoraria).toFormat("dd/MM/yyyy HH:mm")} dentro del bloqueo. Reprogramalo o cancelalo antes de bloquear esa fecha.`,
        );
      const raiz = d || (await crearDisponibilidad(tx, a, artistaId));
      if (
        raiz.bloqueos.some(
          (b) =>
            b.id !== id && b.inicioAt < datos.finAt && b.finAt > datos.inicioAt,
        )
      )
        throw new HttpError(
          409,
          "Ya hay un bloqueo que ocupa parte de ese período. Editá el bloqueo existente.",
        );
      const guardado = id
        ? await tx.bloqueoAgenda.update({ where: { id }, data: datos })
        : await tx.bloqueoAgenda.create({
            data: {
              ...datos,
              disponibilidadId: raiz.id,
              creadaPorId: usuarioId,
            },
          });
      const actualizada = await tx.disponibilidadArtista.update({
        where: { id: raiz.id },
        data: { version: { increment: 1 } },
        select: { version: true },
      });
      return presentarDisponibilidad(
        {
          ...raiz,
          version: actualizada.version,
          bloqueos: [
            ...raiz.bloqueos.filter((b) => b.id !== id),
            guardado,
          ].sort((a, b) => a.inicioAt.getTime() - b.inicioAt.getTime()),
        },
        artista,
        a.zonaHoraria,
        puedeEditar,
      );
    },
  );
}
export async function quitarBloqueo(
  usuarioId: string,
  identificador: unknown,
  identificadorBloqueo: unknown,
  entrada: unknown,
) {
  const artistaId = validarIdConsulta(identificador),
    id = validarIdConsulta(identificadorBloqueo),
    version = validarVersion(objetoEntrada(entrada));
  return conAgenda(
    usuarioId,
    artistaId,
    true,
    async (tx, artista, d, puedeEditar, a) => {
      comprobarVersionDisponibilidad(d?.version || 0, version);
      if (!d?.bloqueos.some((x) => x.id === id))
        throw new HttpError(404, "No encontramos ese bloqueo en esta agenda.");
      await tx.bloqueoAgenda.update({
        where: { id },
        data: { canceladoAt: new Date() },
      });
      const actualizada = await tx.disponibilidadArtista.update({
        where: { id: d.id },
        data: { version: { increment: 1 } },
        select: { version: true },
      });
      return presentarDisponibilidad(
        {
          ...d,
          version: actualizada.version,
          bloqueos: d.bloqueos.filter((b) => b.id !== id),
        },
        artista,
        a.zonaHoraria,
        puedeEditar,
      );
    },
  );
}
