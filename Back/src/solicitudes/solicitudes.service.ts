import { ambitoDeCuenta } from "./solicitudes.ambito.js";
import { EstadoSolicitud, type Prisma } from "@prisma/client";
import { HttpError } from "../errors/http-error.js";
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
import { subirImagen } from "../imagenes/imagenes.service.js";
import { eliminarImagenSegura } from "../imagenes/imagenes.repository.js";
import { prisma } from "../config/prisma.js";
import { TipoColor, GeneroCuerpo, ZonaCuerpoGeneral } from "@prisma/client";

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
export function cotizacionesVigentes(
  s: SolicitudCompleta,
  ahora = new Date(),
) {
  return s.cotizaciones.filter((c) => {
    if (c.validaHasta && c.validaHasta < ahora) return false;

    if (c.artista.rol !== "ARTISTA") return false;

    // Solicitud dirigida a un artista específico.
    if (s.artistaDestinoId) {
      if (c.artistaId !== s.artistaDestinoId) return false;

      // Si pertenece a un estudio, debe seguir activo allí.
      if (s.estudioId) {
        return (
          c.artista.estudioId === s.estudioId &&
          c.artista.estadoEnEstudio === "ACTIVO"
        );
      }

      // Si es independiente, no debe pertenecer a un estudio.
      return !c.artista.estudioId;
    }

    // Solicitud general de un estudio.
    if (s.estudioId) {
      return (
        c.artista.estudioId === s.estudioId &&
        c.artista.estadoEnEstudio === "ACTIVO"
      );
    }

    return false;
  });
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
    if (body.accion === "CERRAR") return cerrarEnTransaccion(tx, s);
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

export async function crearSolicitudCliente(
  usuarioId: string,
  destino: {
    tipo: "ESTUDIO" | "ARTISTA";
    identificador: string;
  },
  datos: any,
  archivoZona?: Express.Multer.File,
  archivoReferencia?: Express.Multer.File,
) {
  let imagenZonaSubida: {
    url: string;
    public_id: string;
  } | null = null;

  let imagenRefSubida: {
    url: string;
    public_id: string;
  } | null = null;

  try {
    // ==========================================
    // 1. RESOLVER EL DESTINO DE LA SOLICITUD
    // ==========================================

    let estudioId: string | null = null;
    let artistaDestinoId: string | null = null;

    if (
      !destino ||
      !["ESTUDIO", "ARTISTA"].includes(destino.tipo) ||
      typeof destino.identificador !== "string" ||
      !destino.identificador.trim()
    ) {
      throw new HttpError(400, "El destino de la solicitud no es válido.");
    }

    if (destino.tipo === "ESTUDIO") {
      // Solicitud general dirigida a un estudio.
      const estudio = await repo.buscarEstudioPorSlug(
        destino.identificador,
      );

      if (!estudio) {
        throw new HttpError(404, "No encontramos el estudio solicitado.");
      }

      estudioId = estudio.id;
    } else {
      // Solicitud dirigida a un artista específico.
      const artista = await repo.buscarArtistaParaSolicitud(
        destino.identificador,
      );

      if (!artista || artista.rol !== "ARTISTA") {
        throw new HttpError(404, "No encontramos al artista solicitado.");
      }

      // Si pertenece a un estudio, debe estar activo.
      if (artista.estudioId) {
        if (artista.estadoEnEstudio !== "ACTIVO") {
          throw new HttpError(
            403,
            "Este artista no está disponible para recibir solicitudes.",
          );
        }

        estudioId = artista.estudioId;
      }

      // Siempre guardamos el ID del artista destinatario.
      artistaDestinoId = artista.id;
    }

    // ==========================================
    // 2. RECUPERAR AL CLIENTE AUTENTICADO
    // ==========================================

    const cliente = await repo.buscarClienteParaSolicitud(usuarioId);

    if (!cliente) {
      throw new HttpError(401, "Debés iniciar sesión.");
    }

    if (cliente.rol !== "CLIENTE") {
      throw new HttpError(
        403,
        "Solo los clientes pueden enviar solicitudes.",
      );
    }

    // ==========================================
    // 3. VALIDAR LOS DATOS DEL FORMULARIO
    // ==========================================

    if (
      typeof datos.estilo !== "string" ||
      !datos.estilo.trim() ||
      typeof datos.descripcion !== "string" ||
      !datos.descripcion.trim()
    ) {
      throw new HttpError(
        400,
        "Completá el estilo y la descripción del tatuaje.",
      );
    }

    if (!cliente.email) {
      throw new HttpError(
        400,
        "Tu cuenta no tiene un correo electrónico registrado.",
      );
    }

    if (
      !["COLOR", "BLACK_AND_GREY"].includes(datos.tipoColor) ||
      !["FEMENINO", "MASCULINO"].includes(datos.generoCuerpo) ||
      ![
        "BRAZO",
        "MANO",
        "TORSO",
        "PIERNA",
        "CABEZA_CUELLO",
      ].includes(datos.zonaGeneral)
    ) {
      throw new HttpError(
        400,
        "Algunos datos del formulario no son válidos.",
      );
    }

    if (
      typeof datos.subZona !== "string" ||
      !datos.subZona.trim()
    ) {
      throw new HttpError(
        400,
        "Debés indicar la zona específica del tatuaje.",
      );
    }

    // ==========================================
    // 4. SUBIR LAS IMÁGENES A CLOUDINARY
    // ==========================================

    if (archivoZona) {
      imagenZonaSubida = await subirImagen({
        buffer: archivoZona.buffer,
        mimetype: archivoZona.mimetype,
      });
    }

    if (archivoReferencia) {
      imagenRefSubida = await subirImagen({
        buffer: archivoReferencia.buffer,
        mimetype: archivoReferencia.mimetype,
      });
    }

    // ==========================================
    // 5. CREAR LA SOLICITUD
    // ==========================================

    const nuevaSolicitud = await prisma.$transaction(async (tx) => {
      return repo.crearSolicitudClienteRepo(tx, {
        clienteId: cliente.id,

        // Estudio:
        // - Solicitud general: estudioId informado.
        // - Artista de estudio: estudioId informado.
        // - Artista independiente: null.
        estudioId,

        // Artista:
        // - Solicitud general a estudio: null.
        // - Solicitud a cualquier artista: ID informado.
        artistaDestinoId,

        estilo: datos.estilo.trim(),
        tipoColor: datos.tipoColor as TipoColor,
        generoCuerpo: datos.generoCuerpo as GeneroCuerpo,
        zonaGeneral: datos.zonaGeneral as ZonaCuerpoGeneral,

        subZona: datos.subZona.trim(),
        descripcion: datos.descripcion.trim(),

        imagenZonaMarcada: imagenZonaSubida?.url || null,

        referencias: imagenRefSubida?.url
          ? [imagenRefSubida.url]
          : [],

        notas: datos.notas || "",

        nombre: cliente.nombre || "Cliente",
        email: cliente.email,
        telefono: cliente.telefono,
        ciudad: cliente.ciudad,
      });
    });

    return nuevaSolicitud;
  } catch (error) {
    // Si falla la creación, eliminar las imágenes
    // que ya se hayan subido a Cloudinary.

    if (imagenZonaSubida?.public_id) {
      await eliminarImagenSegura(imagenZonaSubida.public_id);
    }

    if (imagenRefSubida?.public_id) {
      await eliminarImagenSegura(imagenRefSubida.public_id);
    }

    throw error;
  }
}
