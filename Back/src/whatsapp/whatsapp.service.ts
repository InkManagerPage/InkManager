import { randomUUID } from "node:crypto";
import type { EstadoMensajeWhatsApp } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import {
  objetoEntrada,
  validarIdConsulta,
} from "../solicitudes/solicitudes.validation.js";
import {
  filtroConversaciones,
  listarConversaciones,
  registrarEntrada,
  registrarEstado,
} from "./whatsapp.repository.js";
import { autorizada, configEnvio } from "./whatsapp.conexion.js";
import {
  configuracionMeta,
  configuracionWhatsApp,
  enviarTexto,
  esIdMeta,
} from "./whatsapp.proveedor.js";

type MensajeMeta = {
  from?: string;
  to?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type Webhook = {
  object?: string;
  entry?: {
    id?: string;
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: MensajeMeta[];
        message_echoes?: MensajeMeta[];
        statuses?: {
          id?: string;
          status?: string;
          biz_opaque_callback_data?: string;
        }[];
      };
    }[];
  }[];
};

const estados: Record<
  string,
  [EstadoMensajeWhatsApp, EstadoMensajeWhatsApp[]]
> = {
  sent: ["ENVIADO", ["ENVIANDO", "INCIERTO"]],
  delivered: ["ENTREGADO", ["ENVIANDO", "INCIERTO", "ENVIADO"]],
  read: ["LEIDO", ["ENVIANDO", "INCIERTO", "ENVIADO", "ENTREGADO"]],
  failed: ["ERROR", ["ENVIANDO", "INCIERTO", "ENVIADO"]],
};

async function destinoWhatsApp(numeroId: string, wabaId: string | undefined) {
  const c = await prisma.conexionWhatsApp.findUnique({ where: { numeroId } });
  const piloto = configuracionWhatsApp();
  if (c) {
    if (!configuracionMeta() || c.wabaId !== wabaId || !autorizada(c))
      return null;
    if (!c.activadaAt) {
      if (!c.requierePin && c.bloqueoHasta && c.bloqueoHasta > new Date())
        throw new HttpError(503, "La activación de WhatsApp está en curso.");
      return null;
    }
  } else if (
    !piloto ||
    piloto.numeroId !== numeroId ||
    (piloto.estudioId &&
      (await prisma.conexionWhatsApp.findUnique({
        where: { estudioId: piloto.estudioId },
        select: { estudioId: true },
      })))
  ) {
    return null;
  }
  const estudioId = c?.estudioId ?? piloto?.estudioId ?? null;
  const artistaId = c ? null : (piloto?.artistaId ?? null);
  const cuenta = estudioId
    ? await prisma.estudio
        .findUnique({
          where: { id: estudioId },
          select: {
            propietario: {
              select: {
                id: true,
                rol: true,
                estudioId: true,
                suspendidoAt: true,
              },
            },
          },
        })
        .then((e) => {
          const u = e?.propietario;
          return u?.rol === "ESTUDIO_ADMIN" &&
            u.estudioId === estudioId &&
            !u.suspendidoAt
            ? u.id
            : null;
        })
    : await prisma.usuario
        .findFirst({
          where: {
            id: artistaId!,
            rol: "ARTISTA",
            estudioId: null,
            suspendidoAt: null,
          },
          select: { id: true },
        })
        .then((u) => u?.id);
  return cuenta ? { estudioId, artistaId, cuenta } : null;
}

export async function recibirWhatsApp(datos: Webhook) {
  if (
    datos?.object !== "whatsapp_business_account" ||
    !Array.isArray(datos.entry)
  )
    return;
  const destinos = new Map<
    string,
    Awaited<ReturnType<typeof destinoWhatsApp>>
  >();
  for (const entrada of datos.entry) {
    if (!Array.isArray(entrada?.changes)) continue;
    for (const cambio of entrada.changes) {
      const valor = cambio?.value;
      const numeroId = valor?.metadata?.phone_number_id;
      const propio = cambio?.field === "smb_message_echoes";
      if (
        !valor ||
        !esIdMeta(numeroId) ||
        (!propio && cambio?.field !== "messages")
      )
        continue;
      const clave = numeroId + ":" + (entrada.id ?? "");
      if (!destinos.has(clave))
        destinos.set(clave, await destinoWhatsApp(numeroId, entrada.id));
      const destino = destinos.get(clave);
      if (!destino) continue;
      const mensajes = propio ? valor.message_echoes : valor.messages;
      for (const mensaje of Array.isArray(mensajes) ? mensajes : []) {
        const remitente = propio ? mensaje?.to : mensaje?.from;
        if (
          typeof mensaje?.id !== "string" ||
          !mensaje.id ||
          mensaje.id.length > 500 ||
          typeof remitente !== "string" ||
          !/^\d{5,20}$/.test(remitente)
        )
          continue;
        const tiempo = Number(mensaje.timestamp) * 1000;
        if (
          !Number.isFinite(tiempo) ||
          tiempo < 1 ||
          tiempo > Date.now() + 300000
        )
          continue;
        const nombre = Array.isArray(valor.contacts)
          ? valor.contacts.find((c) => c?.wa_id === remitente)?.profile?.name
          : null;
        const texto =
          mensaje.type === "text" && typeof mensaje.text?.body === "string"
            ? mensaje.text.body.slice(0, 4096)
            : "Este mensaje contiene contenido multimedia.";
        await registrarEntrada({
          numeroId,
          estudioId: destino.estudioId,
          artistaId: destino.artistaId,
          propio,
          remitente,
          nombre:
            typeof nombre === "string" && nombre.trim()
              ? nombre.trim().slice(0, 120)
              : "+" + remitente,
          texto,
          proveedorId: mensaje.id,
          fecha: new Date(tiempo),
          destinatario: destino.cuenta,
        });
      }
      for (const cambio of !propio && Array.isArray(valor.statuses)
        ? valor.statuses
        : []) {
        const regla =
          cambio?.status && Object.hasOwn(estados, cambio.status)
            ? estados[cambio.status]
            : undefined;
        if (regla && typeof cambio.id === "string")
          await registrarEstado(
            numeroId,
            cambio.id,
            cambio.biz_opaque_callback_data,
            ...regla,
          );
      }
    }
  }
}

export async function bandejaWhatsApp(usuarioId: string) {
  const a = await resolverAmbito(usuarioId);
  if (!a.administra && !a.puedeProponer)
    return { conectado: false, conversaciones: [] };
  const [config, conversaciones] = await Promise.all([
    configEnvio(a.estudioId, a.estudioId ? null : usuarioId),
    listarConversaciones(a),
  ]);
  return {
    conectado: Boolean(config),
    conversaciones: conversaciones.map(({ numeroId, ...hilo }) => ({
      ...hilo,
      puedeResponder: config?.numeroId === numeroId,
    })),
  };
}

async function conversacionPermitida(usuarioId: string, id: unknown) {
  const a = await resolverAmbito(usuarioId);
  if (!a.administra && !a.puedeProponer)
    throw new HttpError(403, "No podés gestionar mensajes.");
  const hilo = await prisma.conversacionWhatsApp.findFirst({
    where: { id: validarIdConsulta(id), ...filtroConversaciones(a) },
  });
  if (!hilo) throw new HttpError(404, "No encontramos la conversación.");
  return { a, hilo };
}

export async function responderWhatsApp(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const body = objetoEntrada(entrada);
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  const claveEnvio = validarIdConsulta(body.clave);
  if (!texto || texto.length > 2000)
    throw new HttpError(400, "Escribí un mensaje de hasta 2000 caracteres.");
  const { hilo } = await conversacionPermitida(usuarioId, id);
  const comprobarEnvio = async () => {
    const anterior = await prisma.mensajeWhatsApp.findUnique({
      where: { claveEnvio },
    });
    if (
      anterior &&
      (anterior.conversacionId !== hilo.id || anterior.texto !== texto)
    )
      throw new HttpError(409, "El envío ya fue utilizado.");
    return Boolean(anterior);
  };
  if (await comprobarEnvio()) return;
  const config = await configEnvio(hilo.estudioId, hilo.artistaId);
  if (!config || config.numeroId !== hilo.numeroId)
    throw new HttpError(503, "WhatsApp no está conectado para este negocio.");
  if (Date.now() - hilo.ultimaEntradaAt.getTime() >= 86400000)
    throw new HttpError(
      409,
      "La ventana de respuesta cerró. Esperá un nuevo mensaje del cliente.",
    );

  const mensajeId = randomUUID();
  const fecha = new Date();
  const { count } = await prisma.mensajeWhatsApp.createMany({
    data: [
      {
        id: mensajeId,
        claveEnvio,
        conversacionId: hilo.id,
        texto,
        propio: true,
        estado: "ENVIANDO",
        fecha,
      },
    ],
    skipDuplicates: true,
  });
  if (!count) {
    await comprobarEnvio();
    return;
  }
  let proveedorId: string | undefined;
  let estado: EstadoMensajeWhatsApp;
  let revocada = false;
  try {
    proveedorId = await enviarTexto(config, hilo.remitente, texto, mensajeId);
    estado = "ENVIADO";
  } catch (error) {
    estado = error instanceof HttpError ? "ERROR" : "INCIERTO";
    revocada = error instanceof HttpError && error.status === 401;
  }
  await prisma.$transaction([
    prisma.mensajeWhatsApp.updateMany({
      where: { id: mensajeId, estado: "ENVIANDO" },
      data: { estado, ...(proveedorId ? { proveedorId } : {}) },
    }),
    prisma.conversacionWhatsApp.updateMany({
      where: { id: hilo.id, ultimaActividad: { lt: fecha } },
      data: { ultimaActividad: fecha },
    }),
    ...(revocada && hilo.estudioId && config.tokenCifrado
      ? [
          prisma.conexionWhatsApp.updateMany({
            where: {
              estudioId: hilo.estudioId,
              tokenCifrado: config.tokenCifrado,
            },
            data: { expiraAt: new Date() },
          }),
        ]
      : []),
  ]);
}

export async function marcarConversacion(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const { hilo } = await conversacionPermitida(usuarioId, id);
  const { hasta } = objetoEntrada(entrada);
  const fecha = typeof hasta === "string" ? new Date(hasta) : null;
  if (!fecha || !Number.isFinite(fecha.getTime()) || fecha > new Date())
    throw new HttpError(400, "La fecha de lectura no es válida.");
  await prisma.mensajeWhatsApp.updateMany({
    where: {
      conversacionId: hilo.id,
      propio: false,
      leidoAt: null,
      fecha: { lte: fecha },
    },
    data: { leidoAt: new Date() },
  });
}

export async function vincularConsulta(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const { a, hilo } = await conversacionPermitida(usuarioId, id);
  if (!a.administra)
    throw new HttpError(403, "Solo el titular puede vincular una consulta.");
  const valor = objetoEntrada(entrada).solicitudId;
  const solicitudId = valor === null ? null : validarIdConsulta(valor);
  if (solicitudId) {
    const solicitud = await prisma.solicitud.findFirst({
      where: {
        id: solicitudId,
        estudioId: hilo.estudioId,
        ...(hilo.artistaId ? { artistaDestinoId: hilo.artistaId } : {}),
      },
      select: { id: true },
    });
    if (!solicitud)
      throw new HttpError(404, "No encontramos la consulta en este negocio.");
  }
  await prisma.conversacionWhatsApp.update({
    where: { id: hilo.id },
    data: { solicitudId },
  });
}
