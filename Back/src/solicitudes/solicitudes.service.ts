import { ambitoDeCuenta } from "./solicitudes.ambito.js";
import { EstadoSolicitud, type Prisma } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import { listarCitas } from "../citas/citas.repository.js";
import { presentarCita } from "../citas/citas.entity.js";
import { listarInvitaciones } from "../invitaciones-equipo/invitaciones-equipo.repository.js";
import { presentarInvitacion } from "../invitaciones-equipo/invitaciones-equipo.entity.js";
import { listarBloqueosAgenda } from "../bloqueos-agenda/bloqueos-agenda.repository.js";
import * as repo from "./solicitudes.repository.js";
import {
  detalleSolicitud,
  estadoPanel,
  presentarSolicitud,
  type AmbitoConsultas,
  type SolicitudCompleta,
} from "./solicitudes.entity.js";
import {
  objetoEntrada,
  validarIdConsulta,
  validarVersion,
} from "./solicitudes.validation.js";

export async function resolverAmbito(
  usuarioId: string,
): Promise<AmbitoConsultas> {
  return ambitoDeCuenta(await repo.buscarCuenta(usuarioId));
}
export function comprobarVersion(s: SolicitudCompleta, version: number) {
  if (s.version !== version)
    throw new HttpError(
      409,
      "La consulta cambió. Actualizá la bandeja antes de guardar.",
    );
}
export function cotizacionesVigentes(s: SolicitudCompleta, ahora = new Date()) {
  return s.cotizaciones.filter(
    (c) =>
      (!c.validaHasta || c.validaHasta >= ahora) &&
      c.artista.rol === "ARTISTA" &&
      !c.artista.suspendidoAt &&
      (s.estudioId
        ? c.artista.estudioId === s.estudioId &&
          c.artista.estadoEnEstudio === "ACTIVO"
        : c.artistaId === s.artistaDestinoId && !c.artista.estudioId),
  );
}
export async function cerrarEnTransaccion(
  tx: Prisma.TransactionClient,
  s: SolicitudCompleta,
  ahora = new Date(),
) {
  if (estadoPanel(s.estado) !== "ABIERTA") return s;
  const opciones = cotizacionesVigentes(s, ahora);
  const unica = opciones.length === 1 ? opciones[0] : null;
  return tx.solicitud.update({
    where: { id: s.id },
    data: {
      estado: unica
        ? EstadoSolicitud.ASIGNADA
        : opciones.length > 1
          ? EstadoSolicitud.ELECCION_CLIENTE
          : EstadoSolicitud.POR_ASIGNAR,
      artistaAsignadoId: unica?.artistaId || null,
      asignadaPor: unica ? "UNICA_PROPUESTA" : null,
      cerradaAt: ahora,
      version: { increment: 1 },
    },
    include: detalleSolicitud,
  });
}
export async function obtenerBandeja(usuarioId: string) {
  const ambito = await resolverAmbito(usuarioId);
  await repo.cerrarVencidasDelAmbito(ambito);
  const [recibidas, equipo, citas, invitaciones, bloqueosAgenda] =
    await Promise.all([
      repo.listarSolicitudes(ambito),
      repo.listarEquipo(ambito),
      listarCitas(ambito),
      listarInvitaciones(ambito),
      listarBloqueosAgenda(ambito),
    ]);
  const porId = new Map(recibidas.map((s) => [s.id, s]));
  for (const c of citas)
    if (!porId.has(c.solicitudId)) porId.set(c.solicitudId, c.solicitud);
  const solicitudes = [...porId.values()];
  const clientes = new Map<
    string,
    {
      id: string;
      nombre: string;
      email: string;
      telefono: string;
      ciudad: string;
      notas: string;
      editable?: boolean;
      recordatorios?: unknown;
    }
  >();
  for (const s of solicitudes) {
    const c = s.contacto || s.cliente;
    if (c)
      clientes.set(c.id, {
        id: c.id,
        nombre: c.nombre || "Cliente",
        email: c.email,
        telefono: c.telefono || "",
        ciudad: c.ciudad || "",
        notas: "notas" in c && typeof c.notas === "string" ? c.notas : "",
        editable: ambito.administra && Boolean(s.contacto),
        recordatorios: s.contacto?.recordatorios || {},
      });
  }
  return {
    contexto: ambito,
    clientes: [...clientes.values()],
    equipo: equipo.map((a) => ({
      id: a.id,
      nombre: a.nombreArtistico || a.nombre || "Artista",
      email: ambito.administra ? a.email : "",
      estilos: a.estilosPrincipales.join(" · "),
      estado: a.estadoEnEstudio,
      version: a.versionEquipo,
      turnosPendientes: a._count.citas,
      consultasAsignadas: a._count.solicitudesAsignadas,
    })),
    consultas: solicitudes.map((s) => presentarSolicitud(s, ambito)),
    citas: citas.map((c) => presentarCita(c, ambito)),
    invitaciones: invitaciones.map((i) => presentarInvitacion(i)),
    bloqueosAgenda,
  };
}
export async function cambiarSolicitud(
  usuarioId: string,
  identificador: unknown,
  entrada: unknown,
) {
  const ambito = await resolverAmbito(usuarioId);
  if (!ambito.administra)
    throw new HttpError(
      403,
      "Solo el titular puede administrar esta consulta.",
    );
  const id = validarIdConsulta(identificador),
    body = objetoEntrada(entrada),
    version = validarVersion(body);
  const resultado = await repo.mutarSolicitud(ambito, id, async (tx, s) => {
    comprobarVersion(s, version);
    if (body.accion === "CERRAR") {
      const cerrada = await cerrarEnTransaccion(tx, s);
      const artistaId = cerrada.artistaAsignadoId;
      if (artistaId && artistaId !== usuarioId && cerrada.version !== s.version)
        await registrarAviso(tx, { usuarioId: artistaId, clave: "asignacion:" + id + ":" + version,
          titulo: "Te asignaron una consulta", detalle: s.titulo || "Nueva asignación",
          destino: "/artista/consultas?consulta=" + id });
      return cerrada;
    }
    if (body.accion === "ARCHIVAR") {
      if (
        await tx.cita.count({
          where: {
            solicitudId: id,
            estado: { in: ["PENDIENTE", "CONFIRMADA"] },
          },
        })
      )
        throw new HttpError(
          409,
          "Completá o cancelá los turnos activos antes de archivar la consulta.",
        );
      return tx.solicitud.update({
        where: { id },
        data: { estado: "ARCHIVADA", version: { increment: 1 } },
        include: detalleSolicitud,
      });
    }
    if (body.accion === "CIERRE") {
      if (estadoPanel(s.estado) !== "ABIERTA")
        throw new HttpError(409, "La recepción de propuestas ya está cerrada.");
      const fecha =
        body.cierre === null
          ? null
          : typeof body.cierre === "string"
            ? new Date(body.cierre)
            : new Date(NaN);
      if (fecha && (!Number.isFinite(fecha.getTime()) || fecha <= new Date()))
        throw new HttpError(400, "Elegí una fecha de cierre futura.");
      return tx.solicitud.update({
        where: { id },
        data: { cierrePropuestasAt: fecha, version: { increment: 1 } },
        include: detalleSolicitud,
      });
    }
    if (body.accion === "ASIGNAR") {
      if (estadoPanel(s.estado) === "ARCHIVADA")
        throw new HttpError(409, "La consulta está archivada.");
      const artistaId = validarIdConsulta(body.artistaId);
      if (
        artistaId !== s.artistaAsignadoId &&
        (await tx.cita.count({
          where: {
            solicitudId: id,
            estado: { in: ["PENDIENTE", "CONFIRMADA"] },
          },
        }))
      )
        throw new HttpError(
          409,
          "Cancelá los turnos activos antes de reasignar la consulta.",
        );
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${artistaId} FOR SHARE`;
      const artista = await tx.usuario.findFirst({
        where: {
          id: artistaId,
          rol: "ARTISTA",
          suspendidoAt: null,
          ...(ambito.tipo === "ESTUDIO"
            ? { estudioId: ambito.estudioId, estadoEnEstudio: "ACTIVO" }
            : { id: usuarioId, estudioId: null }),
        },
        select: { id: true },
      });
      if (!artista)
        throw new HttpError(
          400,
          "Elegí un artista activo de este espacio de trabajo.",
        );
      if (artista.id !== s.artistaAsignadoId && artista.id !== usuarioId)
        await registrarAviso(tx, { usuarioId: artista.id, clave: "asignacion:" + id + ":" + version,
          titulo: "Te asignaron una consulta", detalle: s.titulo || "Nueva asignación",
          destino: "/artista/consultas?consulta=" + id });
      return tx.solicitud.update({
        where: { id },
        data: {
          estado: "ASIGNADA",
          artistaAsignadoId: artista.id,
          asignadaPor: "ESTUDIO",
          cerradaAt: s.cerradaAt || new Date(),
          version: { increment: 1 },
        },
        include: detalleSolicitud,
      });
    }
    throw new HttpError(400, "La acción no es válida.");
  });
  return presentarSolicitud(resultado, ambito);
}
