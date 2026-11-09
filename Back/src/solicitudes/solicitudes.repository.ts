import { prisma } from "../config/prisma.js";
import {
  Prisma,
  TipoColor,
  GeneroCuerpo,
  ZonaCuerpoGeneral,
} from "@prisma/client";
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

export function filtroAmbito(
  a: AmbitoConsultas,
): Prisma.SolicitudWhereInput {
  if (a.tipo === "INDEPENDIENTE") {
    return {
      artistaDestinoId: a.usuarioId,
      estudioId: null,
    };
  }

  if (a.administra) {
    return {
      estudioId: a.estudioId,
    };
  }

  if (!a.puedeProponer) {
    return {
      estudioId: a.estudioId,
      artistaAsignadoId: a.usuarioId,
    };
  }

  return {
    estudioId: a.estudioId,
    OR: [
      { artistaDestinoId: null },
      { artistaDestinoId: a.usuarioId },
    ],
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
        ? {
            estudioId: a.estudioId,
            rol: "ARTISTA",
          }
        : {
            id: a.usuarioId,
            rol: "ARTISTA",
          },
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
      await tx.$queryRaw`
        SELECT "id"
        FROM "Usuario"
        WHERE "id" = ${a.usuarioId}
        FOR SHARE
      `;

      const usuario = await tx.usuario.findUnique({
        where: { id: a.usuarioId },
        select: {
          rol: true,
          estudioId: true,
          estadoEnEstudio: true,
        },
      });

      if (
        !usuario ||
        (a.tipo === "INDEPENDIENTE" &&
          (usuario.rol !== "ARTISTA" || usuario.estudioId)) ||
        (a.tipo === "ESTUDIO" && usuario.estudioId !== a.estudioId)
      ) {
        throw new HttpError(
          403,
          "Tu modalidad de trabajo cambió. Volvé a cargar el panel.",
        );
      }

      if (a.tipo === "ESTUDIO") {
        if (a.administra) {
          const titular =
            usuario.rol === "ESTUDIO_ADMIN" &&
            (await tx.estudio.findFirst({
              where: {
                id: a.estudioId!,
                propietarioId: a.usuarioId,
              },
              select: { id: true },
            }));

          if (!titular) {
            throw new HttpError(
              403,
              "No tenés permisos para administrar este estudio.",
            );
          }
        } else if (usuario.rol !== "ARTISTA") {
          throw new HttpError(
            403,
            "Tu rol cambió. Volvé a cargar el panel.",
          );
        } else if (usuario.estadoEnEstudio !== "ACTIVO") {
          throw new HttpError(
            403,
            "Solo podés consultar el panel mientras estés suspendido.",
          );
        }
      }
      const visible = await tx.solicitud.findFirst({
        where: {
          ...filtroAmbito(a),
          id,
        },
        select: { id: true },
      });

      if (!visible) {
        throw new HttpError(404, "No encontramos esa consulta.");
      }

      await tx.$queryRaw`
        SELECT "id"
        FROM "Solicitud"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      const solicitud = await tx.solicitud.findUniqueOrThrow({
        where: { id },
        include: detalleSolicitud,
      });

      return operacion(tx, solicitud);
    },
    {
      timeout: 20000,
      maxWait: 10000,
    },
  );
}

export async function cerrarVencidasDelAmbito(a: AmbitoConsultas) {

  let filtro: Prisma.Sql;

  if (a.tipo === "INDEPENDIENTE") {
    filtro = Prisma.sql`
      s."artistaDestinoId" = ${a.usuarioId}
      AND s."estudioId" IS NULL
    `;
  } else if (a.administra) {
    filtro = Prisma.sql`
      s."estudioId" = ${a.estudioId}
    `;
  } else if (!a.puedeProponer) {
    filtro = Prisma.sql`
      s."estudioId" = ${a.estudioId}
      AND s."artistaAsignadoId" = ${a.usuarioId}
    `;
  } else {
    filtro = Prisma.sql`
      s."estudioId" = ${a.estudioId}
      AND (
        s."artistaDestinoId" IS NULL
        OR s."artistaDestinoId" = ${a.usuarioId}
      )
    `;
  }

  await prisma.$executeRaw(Prisma.sql`
    WITH vencidas AS (
      SELECT s."id"
      FROM "Solicitud" s
      WHERE
        ${filtro}
        AND s."estado" IN ('PENDIENTE', 'EN_COTIZACION')
        AND s."cierrePropuestasAt" <= CURRENT_TIMESTAMP
      ORDER BY s."cierrePropuestasAt", s."id"
      LIMIT 200
      FOR UPDATE SKIP LOCKED
    ),

    opciones AS (
      SELECT
        s."id",
        COUNT(c."id")::int AS cantidad,
        MIN(c."artistaId") AS artista

      FROM vencidas v

      JOIN "Solicitud" s
        ON s."id" = v."id"

      LEFT JOIN "Cotizacion" c
        ON c."solicitudId" = s."id"

        AND (
          c."validaHasta" IS NULL
          OR c."validaHasta" >= CURRENT_TIMESTAMP
        )

        AND EXISTS (
          SELECT 1
          FROM "Usuario" u
          WHERE
            u."id" = c."artistaId"
            AND u."rol" = 'ARTISTA'

            AND (
              -- Solicitud dirigida a un artista específico de un estudio.
              (
                s."artistaDestinoId" IS NOT NULL
                AND s."estudioId" IS NOT NULL
                AND u."id" = s."artistaDestinoId"
                AND u."estudioId" = s."estudioId"
                AND u."estadoEnEstudio" = 'ACTIVO'
              )

              OR

              -- Solicitud general de un estudio.
              (
                s."artistaDestinoId" IS NULL
                AND s."estudioId" IS NOT NULL
                AND u."estudioId" = s."estudioId"
                AND u."estadoEnEstudio" = 'ACTIVO'
              )

              OR

              -- Solicitud dirigida a un artista independiente.
              (
                s."estudioId" IS NULL
                AND s."artistaDestinoId" IS NOT NULL
                AND u."id" = s."artistaDestinoId"
                AND u."estudioId" IS NULL
              )
            )
        )

      GROUP BY s."id"
    )

    UPDATE "Solicitud" s

    SET
      "estado" = (
        CASE
          WHEN o.cantidad = 1 THEN 'ASIGNADA'
          WHEN o.cantidad > 1 THEN 'ELECCION_CLIENTE'
          ELSE 'POR_ASIGNAR'
        END
      )::"EstadoSolicitud",

      "artistaAsignadoId" = CASE
        WHEN o.cantidad = 1 THEN o.artista
        ELSE NULL
      END,

      "asignadaPor" = CASE
        WHEN o.cantidad = 1 THEN 'UNICA_PROPUESTA'
        ELSE NULL
      END,

      "cerradaAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP,
      "version" = s."version" + 1

    FROM opciones o

    WHERE s."id" = o."id"
  `);
}

export async function crearSolicitudClienteRepo(
  tx: Prisma.TransactionClient,
  datos: {
    clienteId: string;

    estudioId?: string | null;
    artistaDestinoId?: string | null;

    estilo: string;
    tipoColor: TipoColor;
    generoCuerpo: GeneroCuerpo;
    zonaGeneral: ZonaCuerpoGeneral;
    subZona: string;
    descripcion: string;

    imagenZonaMarcada?: string | null;
    referencias?: string[];
    notas?: string;

    nombre: string;
    email: string;
    telefono?: string | null;
    ciudad?: string | null;
  },
) {
  let contacto;

  if (datos.estudioId) {
    contacto = await tx.contacto.upsert({
      where: {
        estudioId_email: {
          estudioId: datos.estudioId,
          email: datos.email,
        },
      },

      create: {
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono || "",
        ciudad: datos.ciudad || "",
        notas: "",
        estudio: {
          connect: {
            id: datos.estudioId,
          },
        },
      },

      update: {
        nombre: datos.nombre,
        telefono: datos.telefono || "",
        ciudad: datos.ciudad || "",
      },
    });
  } else if (datos.artistaDestinoId) {

    contacto = await tx.contacto.upsert({
      where: {
        artistaId_email: {
          artistaId: datos.artistaDestinoId,
          email: datos.email,
        },
      },

      create: {
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono || "",
        ciudad: datos.ciudad || "",
        notas: "",
        artista: {
          connect: {
            id: datos.artistaDestinoId,
          },
        },
      },

      update: {
        nombre: datos.nombre,
        telefono: datos.telefono || "",
        ciudad: datos.ciudad || "",
      },
    });
  } else {
    throw new HttpError(
      400,
      "La solicitud debe estar dirigida a un estudio o a un artista.",
    );
  }

  return tx.solicitud.create({
    data: {
      cliente: {
        connect: {
          id: datos.clienteId,
        },
      },

      ...(datos.estudioId
        ? {
            estudio: {
              connect: {
                id: datos.estudioId,
              },
            },
          }
        : {}),

      ...(datos.artistaDestinoId
        ? {
            artistaDestino: {
              connect: {
                id: datos.artistaDestinoId,
              },
            },
          }
        : {}),

      contacto: {
        connect: {
          id: contacto.id,
        },
      },

      estilo: datos.estilo,
      tipoColor: datos.tipoColor,
      generoCuerpo: datos.generoCuerpo,
      zonaGeneral: datos.zonaGeneral,
      subZona: datos.subZona,
      descripcion: datos.descripcion,

      imagenZonaMarcada: datos.imagenZonaMarcada || null,
      referencias: datos.referencias || [],
      notas: datos.notas || "",

      estado: "PENDIENTE",
    },

    include: detalleSolicitud,
  });
}

export function buscarEstudioPorSlug(slug: string) {
  return prisma.estudio.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
    },
  });
}

export async function buscarArtistaParaSolicitud(slug: string) {
  const artistas = await prisma.usuario.findMany({
    where: {
      rol: "ARTISTA",
      nombreArtistico: {
        not: null,
      },
    },
    select: {
      id: true,
      rol: true,
      nombreArtistico: true,
      estudioId: true,
      estadoEnEstudio: true,
      estudio: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  const coincidencias = artistas.filter((artista) => {
    const nombre = artista.nombreArtistico;

    if (!nombre) return false;

    const slugGenerado = nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return slugGenerado === slug;
  });

  if (coincidencias.length > 1) {
    throw new HttpError(
      409,
      "Hay más de un artista con ese nombre artístico. No se puede identificar el destinatario.",
    );
  }

  return coincidencias[0] ?? null;
}

export function buscarClienteParaSolicitud(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      rol: true,
      nombre: true,
      email: true,
      telefono: true,
      ciudad: true,
    },
  });
}
