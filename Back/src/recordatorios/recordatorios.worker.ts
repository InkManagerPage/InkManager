import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma } from "../config/prisma.js";
import { enviarCorreo } from "../correos/correos.service.js";
import type { Correo } from "../correos/correos.entity.js";
import { cerrarVencidasDelAmbito } from "../solicitudes/solicitudes.repository.js";
import {
  tiposCliente,
  tiposCuenta,
  type Preferencias,
  type Regla,
  type TipoCliente,
} from "./recordatorios.validation.js";

const persona = {
  id: true,
  email: true,
  nombre: true,
  nombreArtistico: true,
  zonaHoraria: true,
  suspendidoAt: true,
  preferenciasCorreo: true,
} satisfies Prisma.UsuarioSelect;
const detalle = {
  artista: { select: persona },
  solicitud: {
    include: {
      contacto: true,
      cliente: { select: { email: true, nombre: true } },
      estudio: {
        select: {
          nombre: true,
          zonaHoraria: true,
          propietario: { select: persona },
        },
      },
    },
  },
} satisfies Prisma.CitaInclude;
type CitaCorreo = Prisma.CitaGetPayload<{ include: typeof detalle }>;
type Enviar = (correo: Correo) => Promise<void>;

function render(texto: string, datos: Record<string, string>) {
  return texto.replace(
    /\{\{\s*([^}]+)\s*\}\}/g,
    (_original, clave: string) => datos[clave.trim()] || "",
  );
}
function html(texto: string) {
  return (
    "<p>" +
    texto
      .replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
      )
      .replace(/\n/g, "<br>") +
    "</p>"
  );
}
function programado(fecha: DateTime, ahora: DateTime, alta: Date) {
  const atraso = ahora.diff(fecha, "hours").hours;
  return fecha.toMillis() >= alta.getTime() && atraso >= 0 && atraso < 24;
}

async function entregar(
  clave: string,
  para: string,
  regla: Regla,
  datos: Record<string, string>,
  enviar: Enviar,
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return;
  const ahora = new Date();
  const { count } = await prisma.entregaRecordatorio.createMany({
    data: [{ clave, reclamadaAt: ahora }],
    skipDuplicates: true,
  });
  if (!count) {
    const reclamada = await prisma.entregaRecordatorio.updateMany({
      where: {
        clave,
        enviadaAt: null,
        intentos: { lt: 4 },
        reclamadaAt: { lt: new Date(ahora.getTime() - 300000) },
      },
      data: { reclamadaAt: ahora, intentos: { increment: 1 } },
    });
    if (!reclamada.count) return;
  }
  const texto = render(regla.mensaje, datos);
  try {
    await enviar({
      clave,
      para,
      asunto: render(regla.asunto, datos).replace(/[\r\n]+/g, " "),
      texto,
      html: html(texto),
    });
    await prisma.entregaRecordatorio.update({
      where: { clave },
      data: { enviadaAt: new Date() },
    });
  } catch {
    console.warn(
      "No se pudo enviar un recordatorio. Se reintentará dentro de su ventana.",
    );
  }
}

async function correosDeCita(c: CitaCorreo, ahora: DateTime, enviar: Enviar) {
  const cuenta = c.solicitud.estudio
    ? c.solicitud.estudio.propietario
    : c.artista;
  const registro = cuenta?.preferenciasCorreo;
  const cliente = c.solicitud.contacto || c.solicitud.cliente;
  if (!registro || cuenta?.suspendidoAt || !cliente) return;
  const config = registro.reglas as unknown as Preferencias;
  if (!config.clientesHabilitados) return;
  const zona = c.solicitud.estudio?.zonaHoraria || c.artista.zonaHoraria;
  const inicio = DateTime.fromJSDate(c.inicioAt, { zone: zona }).setLocale(
    "es-AR",
  );
  const excepcionesCita = c.recordatorios as Partial<
    Record<TipoCliente, boolean>
  >;
  const excepcionesContacto = c.solicitud.contacto?.recordatorios as
    Partial<Record<TipoCliente, boolean>> | undefined;
  for (const tipo of tiposCliente) {
    const regla = config.reglas[tipo];
    if (!(
      excepcionesCita?.[tipo] ??
      excepcionesContacto?.[tipo] ??
      regla.activo
    ))
      continue;
    if (tipo === "TURNO" && (c.estado !== "CONFIRMADA" || inicio <= ahora))
      continue;
    if (tipo !== "TURNO" && (c.estado !== "COMPLETADA" || !c.completadaAt))
      continue;
    const completada = c.completadaAt
      ? DateTime.fromJSDate(c.completadaAt, { zone: zona })
      : inicio;
    const fecha =
      tipo === "TURNO"
        ? inicio.minus({ hours: regla.horas })
        : tipo === "CUIDADOS"
          ? completada.plus({ hours: regla.horas })
          : completada.plus({ days: regla.dias });
    if (!programado(fecha, ahora, registro.createdAt)) continue;
    const clave =
      tipo +
      ":" +
      c.id +
      (tipo === "TURNO" ? ":" + c.inicioAt.toISOString() : "");
    await entregar(
      clave,
      cliente.email,
      regla,
      {
        cliente: cliente.nombre || "Cliente",
        artista: c.artista.nombreArtistico || c.artista.nombre || "Tu artista",
        fecha: inicio.toFormat("dd/LL/yyyy"),
        hora: inicio.toFormat("HH:mm"),
        trabajo: c.titulo,
      },
      enviar,
    );
  }
}

const cuentaCorreo = {
  ...persona,
  rol: true,
  estudioId: true,
} satisfies Prisma.UsuarioSelect;
async function correosDeCuenta(
  u: Prisma.UsuarioGetPayload<{ select: typeof cuentaCorreo }>,
  ahora: DateTime,
  enviar: Enviar,
) {
  const registro = u.preferenciasCorreo;
  const config = registro?.reglas as unknown as Preferencias | undefined;
  if (!registro || !config?.artistaHabilitado) return;
  const local = ahora.setZone(config.zonaHoraria);
  const hoy = local.startOf("day");
  const filtro: Prisma.CitaWhereInput =
    u.rol === "ESTUDIO_ADMIN"
      ? {
          solicitud: {
            estudioId: u.estudioId!,
            estudio: { propietarioId: u.id },
          },
        }
      : { artistaId: u.id, solicitud: { estudioId: u.estudioId } };
  const nombre = u.nombreArtistico || u.nombre || "Artista";
  for (const tipo of tiposCuenta) {
    const r = config.reglas[tipo];
    if (
      !r.activo ||
      (tipo === "RESUMEN_SEMANAL" && hoy.weekday % 7 !== r.diaSemana) ||
      (tipo === "RESUMEN_MENSUAL" && hoy.day !== 1)
    )
      continue;
    const [hour, minute] = r.hora.split(":").map(Number);
    if (!programado(hoy.set({ hour, minute }), ahora, registro.createdAt))
      continue;
    const dia =
      tipo === "AGENDA" && r.momentoAgenda === "ANTERIOR"
        ? hoy.plus({ days: 1 })
        : hoy;
    const clave = tipo + ":" + u.id + ":" + dia.toISODate();
    const anterior = await prisma.entregaRecordatorio.findUnique({
      where: { clave },
      select: { enviadaAt: true, intentos: true, reclamadaAt: true },
    });
    if (
      anterior &&
      (anterior.enviadaAt ||
        anterior.intentos >= 4 ||
        Date.now() - anterior.reclamadaAt.getTime() < 300000)
    )
      continue;
    if (tipo === "AGENDA") {
      const turnos = await prisma.cita.findMany({
        where: {
          ...filtro,
          estado: { in: ["PENDIENTE", "CONFIRMADA"] },
          inicioAt: {
            gte: dia.toJSDate(),
            lt: dia.plus({ days: 1 }).toJSDate(),
          },
        },
        select: { inicioAt: true, titulo: true },
        orderBy: { inicioAt: "asc" },
        take: 100,
      });
      if (!turnos.length) continue;
      const agenda = turnos
        .map(
          (t) =>
            DateTime.fromJSDate(t.inicioAt, {
              zone: config.zonaHoraria,
            }).toFormat("HH:mm") +
            " · " +
            t.titulo,
        )
        .join("\n");
      await entregar(
        clave,
        u.email,
        r,
        { artista: nombre, fecha: dia.toFormat("dd/LL/yyyy"), agenda },
        enviar,
      );
    } else {
      const desde =
        tipo === "RESUMEN_SEMANAL"
          ? hoy.minus({ days: 7 })
          : hoy.minus({ months: 1 });
      const sesiones = await prisma.cita.count({
        where: {
          ...filtro,
          estado: "COMPLETADA",
          completadaAt: { gte: desde.toJSDate(), lt: hoy.toJSDate() },
        },
      });
      const alcance: Prisma.SolicitudWhereInput =
        u.rol === "ESTUDIO_ADMIN"
          ? { estudioId: u.estudioId!, estudio: { propietarioId: u.id } }
          : {
              estudioId: u.estudioId,
              ...(u.estudioId
                ? { artistaAsignadoId: u.id }
                : { artistaDestinoId: u.id }),
            };
      const [consultas, propuestas] = await Promise.all([
        prisma.solicitud.count({
          where: {
            ...alcance,
            createdAt: { gte: desde.toJSDate(), lt: hoy.toJSDate() },
          },
        }),
        prisma.cotizacion.count({
          where: {
            solicitud: alcance,
            ...(u.rol === "ARTISTA" ? { artistaId: u.id } : {}),
            createdAt: { gte: desde.toJSDate(), lt: hoy.toJSDate() },
          },
        }),
      ]);
      await entregar(
        clave,
        u.email,
        r,
        {
          artista: nombre,
          resumen:
            consultas +
            " consultas, " +
            propuestas +
            " propuestas y " +
            sesiones +
            " sesiones completadas.",
        },
        enviar,
      );
    }
  }
}

export async function procesarRecordatorios(
  ahora = DateTime.utc(),
  enviar: Enviar = enviarCorreo,
) {
  let cursor: string | undefined;
  const reglasActivas = {
    is: { reglas: { path: ["clientesHabilitados"], equals: true } },
  } satisfies Prisma.PreferenciasCorreoNullableScalarRelationFilter;
  for (;;) {
    const citas: CitaCorreo[] = await prisma.cita.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                estado: "CONFIRMADA",
                inicioAt: {
                  gt: ahora.toJSDate(),
                  lte: ahora.plus({ days: 7 }).toJSDate(),
                },
              },
              {
                estado: "COMPLETADA",
                completadaAt: {
                  gte: ahora.minus({ days: 32 }).toJSDate(),
                  lte: ahora.toJSDate(),
                },
              },
            ],
          },
          {
            OR: [
              {
                solicitud: { estudioId: null },
                artista: { preferenciasCorreo: reglasActivas },
              },
              {
                solicitud: {
                  estudio: {
                    propietario: { preferenciasCorreo: reglasActivas },
                  },
                },
              },
            ],
          },
        ],
      },
      include: detalle,
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const c of citas) await correosDeCita(c, ahora, enviar);
    if (citas.length < 100) break;
    cursor = citas.at(-1)!.id;
  }
  cursor = undefined;
  for (;;) {
    const cuentas: Prisma.UsuarioGetPayload<{ select: typeof cuentaCorreo }>[] =
      await prisma.usuario.findMany({
        where: {
          suspendidoAt: null,
          emailVerificado: true,
          preferenciasCorreo: {
            is: { reglas: { path: ["artistaHabilitado"], equals: true } },
          },
          OR: [
            { rol: "ESTUDIO_ADMIN", estudioId: { not: null } },
            {
              rol: "ARTISTA",
              OR: [{ estudioId: null }, { estadoEnEstudio: "ACTIVO" }],
            },
          ],
        },
        select: cuentaCorreo,
        orderBy: { id: "asc" },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    for (const u of cuentas) await correosDeCuenta(u, ahora, enviar);
    if (cuentas.length < 100) break;
    cursor = cuentas.at(-1)!.id;
  }
}

export function iniciarRecordatorios() {
  let ejecutando = false;
  async function revisar() {
    if (ejecutando) return;
    ejecutando = true;
    try {
      await cerrarVencidasDelAmbito();
      await procesarRecordatorios();
    } catch {
      console.error(
        "Falló el procesamiento de tareas programadas de InkManager.",
      );
    } finally {
      ejecutando = false;
    }
  }
  void revisar();
  setInterval(() => void revisar(), 60000).unref();
}
