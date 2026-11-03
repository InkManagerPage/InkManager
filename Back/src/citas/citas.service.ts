import crypto from "node:crypto";
import { HttpError } from "../errors/http-error.js";
import {
  resolverAmbito,
  comprobarVersion,
} from "../solicitudes/solicitudes.service.js";
import { mutarSolicitud } from "../solicitudes/solicitudes.repository.js";
import {
  estadoPanel,
  type AmbitoConsultas,
} from "../solicitudes/solicitudes.entity.js";
import {
  objetoEntrada,
  validarIdConsulta,
  validarVersion,
} from "../solicitudes/solicitudes.validation.js";
import { detalleCita, presentarCita, type DatosCita } from "./citas.entity.js";
import { validarCita, validarTransicion } from "./citas.validation.js";
import * as repo from "./citas.repository.js";
import type { Prisma } from "@prisma/client";
import { IANAZone } from "luxon";
import { comprobarReservaDisponible } from "../disponibilidad/disponibilidad.service.js";
import { cambiarZonaCalendario } from "../disponibilidad/disponibilidad.repository.js";

function asegurarEditor(a: AmbitoConsultas) {
  if (!a.administra && !a.puedeProponer)
    throw new HttpError(
      403,
      "Solo podés consultar tu agenda mientras estés suspendido.",
    );
}
export function traducirErrorCita(error: unknown): never {
  const codigo =
    error && typeof error === "object" && "code" in error ? error.code : null;
  const mensaje = error instanceof Error ? error.message : "";
  if (codigo === "P2002")
    throw new HttpError(
      409,
      "El turno ya se guardó. Actualizá la agenda antes de volver a intentar.",
    );
  if (/Cita_sin_cruces|23P01/.test(mensaje))
    throw new HttpError(
      409,
      "El artista ya tiene un turno en ese horario. Elegí otro horario.",
    );
  throw error;
}
async function comprobarArtista(
  tx: Prisma.TransactionClient,
  a: AmbitoConsultas,
  artistaId: string,
  requiereActivo: boolean,
) {
  if (!a.administra && artistaId !== a.usuarioId)
    throw new HttpError(403, "Solo podés gestionar tus propios turnos.");
  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${artistaId} FOR SHARE`;
  const artista = await tx.usuario.findFirst({
    where: {
      id: artistaId,
      rol: "ARTISTA",
      estudioId: a.estudioId,
      ...(requiereActivo && a.estudioId ? { estadoEnEstudio: "ACTIVO" } : {}),
    },
    select: { id: true },
  });
  if (!artista)
    throw new HttpError(
      409,
      "El artista no está disponible para agendar o reprogramar este turno.",
    );
}
async function comprobarHorario(
  tx: Prisma.TransactionClient,
  d: DatosCita,
  artistaId: string,
  id?: string,
) {
  if (
    d.estado !== "CANCELADA" &&
    (await repo.buscarCruce(tx, artistaId, d.inicioAt, d.finAt, id))
  )
    throw new HttpError(
      409,
      "El artista ya tiene un turno en ese horario. Elegí otro horario.",
    );
}

export async function crearTurno(usuarioId: string, entrada: unknown) {
  const a = await resolverAmbito(usuarioId);
  asegurarEditor(a);
  const d = validarCita(entrada, a.zonaHoraria),
    b = objetoEntrada(entrada),
    claveCreacion = validarIdConsulta(b.claveCreacion);
  const versionConsulta = validarVersion({ version: b.versionConsulta });
  if (b.sesionAdicional !== undefined && typeof b.sesionAdicional !== "boolean")
    throw new HttpError(400, "La modalidad de sesión no es válida.");
  if (!["PENDIENTE", "CONFIRMADA"].includes(d.estado))
    throw new HttpError(400, "Creá el turno por confirmar o confirmado.");
  const huellaCreacion = crypto
    .createHash("sha256")
    .update(JSON.stringify(d))
    .digest("hex");
  try {
    const resultado = await mutarSolicitud(a, d.solicitudId, async (tx, s) => {
      const existente = await tx.cita.findUnique({
        where: { claveCreacion },
        include: detalleCita,
      });
      if (existente) {
        if (
          existente.creadaPorId !== usuarioId ||
          existente.solicitudId !== d.solicitudId ||
          existente.huellaCreacion !== huellaCreacion
        )
          throw new HttpError(
            409,
            "El turno ya existe. Abrilo desde la agenda para editarlo.",
          );
        return { cita: existente, creada: false };
      }
      comprobarVersion(s, versionConsulta);
      if (estadoPanel(s.estado) !== "ASIGNADA" || !s.artistaAsignadoId)
        throw new HttpError(409, "Primero asigná un artista a la consulta.");
      if (
        !b.sesionAdicional &&
        (await tx.cita.count({
          where: { solicitudId: s.id, estado: { not: "CANCELADA" } },
        }))
      )
        throw new HttpError(
          409,
          "Esta consulta ya tiene un turno. Actualizá la agenda y agregá otra sesión manualmente.",
        );
      await comprobarArtista(tx, a, s.artistaAsignadoId, true);
      await comprobarReservaDisponible(
        tx,
        a,
        s.artistaAsignadoId,
        d.inicioAt,
        d.finAt,
      );
      await comprobarHorario(tx, d, s.artistaAsignadoId);
      const cotizacion = s.cotizaciones.find(
        (p) => p.artistaId === s.artistaAsignadoId,
      );
      const cita = await tx.cita.create({
        data: {
          ...d,
          artistaId: s.artistaAsignadoId,
          cotizacionId: cotizacion?.id || null,
          creadaPorId: usuarioId,
          claveCreacion,
          huellaCreacion,
        },
        include: detalleCita,
      });
      return { cita, creada: true };
    });
    return { cita: presentarCita(resultado.cita, a), creada: resultado.creada };
  } catch (error) {
    return traducirErrorCita(error);
  }
}
export async function actualizarTurno(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const a = await resolverAmbito(usuarioId);
  asegurarEditor(a);
  const id = validarIdConsulta(identificador),
    b = objetoEntrada(entrada),
    version = validarVersion(b),
    d = validarCita(b, a.zonaHoraria);
  const anterior = await repo.buscarCita(a, id);
  if (!anterior) throw new HttpError(404, "No encontramos ese turno.");
  if (d.solicitudId !== anterior.solicitudId)
    throw new HttpError(400, "No se puede cambiar la consulta de un turno.");
  try {
    const cita = await mutarSolicitud(
      a,
      anterior.solicitudId,
      async (tx, s) => {
        await tx.$queryRaw`SELECT "id" FROM "Cita" WHERE "id"=${id} FOR UPDATE`;
        const actual = await tx.cita.findUniqueOrThrow({
          where: { id },
          include: detalleCita,
        });
        if (actual.version !== version)
          throw new HttpError(
            409,
            "El turno cambió. Actualizá la agenda antes de guardar.",
          );
        validarTransicion(actual.estado, d.estado, actual.inicioAt);
        if (
          d.estado === "COMPLETADA" &&
          (d.inicioAt.getTime() !== actual.inicioAt.getTime() ||
            d.finAt.getTime() !== actual.finAt.getTime())
        )
          throw new HttpError(
            400,
            "Reprogramá el turno antes de marcarlo como completado.",
          );
        const reprograma =
          d.inicioAt.getTime() !== actual.inicioAt.getTime() ||
          d.finAt.getTime() !== actual.finAt.getTime();
        if (d.estado !== "CANCELADA")
          await comprobarArtista(tx, a, actual.artistaId, reprograma);
        if (reprograma && d.estado !== "CANCELADA")
          await comprobarReservaDisponible(
            tx,
            a,
            actual.artistaId,
            d.inicioAt,
            d.finAt,
          );
        if (
          d.estado !== "CANCELADA" &&
          (estadoPanel(s.estado) !== "ASIGNADA" ||
            s.artistaAsignadoId !== actual.artistaId)
        )
          throw new HttpError(
            409,
            "La asignación de la consulta cambió. Cancelá este turno y agendá uno nuevo.",
          );
        await comprobarHorario(tx, d, actual.artistaId, id);
        return tx.cita.update({
          where: { id },
          data: {
            ...d,
            version: { increment: 1 },
            ...(d.estado === "COMPLETADA" ? { completadaAt: new Date() } : {}),
            ...(d.estado === "CANCELADA" ? { canceladaAt: new Date() } : {}),
          },
          include: detalleCita,
        });
      },
    );
    return presentarCita(cita, a);
  } catch (error) {
    return traducirErrorCita(error);
  }
}

export async function guardarZonaHoraria(usuarioId: string, entrada: unknown) {
  const a = await resolverAmbito(usuarioId);
  if (!a.administra)
    throw new HttpError(
      403,
      "Solo el titular puede cambiar la zona horaria del estudio.",
    );
  const zona = objetoEntrada(entrada).zonaHoraria;
  if (
    typeof zona !== "string" ||
    zona.length > 100 ||
    !IANAZone.isValidZone(zona)
  )
    throw new HttpError(400, "Elegí una zona horaria válida.");
  await cambiarZonaCalendario(a, zona);
  return { zonaHoraria: zona };
}
