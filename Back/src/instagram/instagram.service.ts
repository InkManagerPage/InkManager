import { createHash, randomUUID } from "node:crypto";
import type { ConversacionCanal, EstadoMensajeCanal, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import {
  bloquearConversacionCanal,
  filtroCanal,
  guardarMensajeCanal,
  ventanaRespuesta,
} from "../mensajes/mensajes.repository.js";
import { resolverAmbito } from "../solicitudes/solicitudes.service.js";
import {
  objetoEntrada,
  validarIdConsulta,
} from "../solicitudes/solicitudes.validation.js";
import {
  activaInstagram,
  canalInstagram,
  credencialInstagram,
  credencialVigenteInstagram,
} from "./instagram.conexion.js";
import {
  configuracionInstagram,
  enviarInstagram,
  idInstagram,
  nombreRemitente,
  type TarjetaInstagram,
} from "./instagram.proveedor.js";
import { puedeUsarMensajes } from "../mensajes/mensajes.service.js";
import { planIndividualVigente } from "../pagos/acceso-plan.js";

type Evento = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  postback?: { mid?: string; payload?: string; title?: string };
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_self?: boolean;
    is_deleted?: boolean;
  };
};
type Webhook = {
  object?: string;
  entry?: { id?: string; messaging?: Evento[] }[];
};

export async function recibirInstagram(datos: Webhook) {
  const config = configuracionInstagram();
  if (!config || datos?.object !== "instagram" || !Array.isArray(datos.entry))
    return;
  let conexionPendiente = false;
  for (const entrada of datos.entry) {
    const cuentaId = entrada?.id;
    if (!idInstagram(cuentaId) || !Array.isArray(entrada.messaging)) continue;
    const c = await prisma.conexionCanal.findUnique({
      where: { canal_cuentaId: { canal: canalInstagram, cuentaId } },
      include: { estudio: { select: { propietarioId: true } } },
    });
    if (!c) continue;
    if (!c.activa && credencialVigenteInstagram(c)) {
      conexionPendiente = true;
      continue;
    }
    if (!activaInstagram(c)) continue;
    const destinatario = await prisma.usuario.findFirst({
      where: {
        suspendidoAt: null,
        ...(c.estudioId
          ? {
              id: c.estudio?.propietarioId ?? "",
              rol: "ESTUDIO_ADMIN",
              estudioId: c.estudioId,
            }
          : { id: c.artistaId!, rol: "ARTISTA", estudioId: null, suscripciones: { some: planIndividualVigente() } }),
      },
      select: { id: true },
    });
    if (!destinatario) continue;
    for (const evento of entrada.messaging) {
      const emisor = evento?.sender?.id;
      const receptor = evento?.recipient?.id;
      const propio: boolean = emisor === cuentaId;
      const remitente: string | undefined = propio ? receptor : emisor;
      const mensaje = evento?.message;
      const postback = !propio && c.estudioId ? evento?.postback : undefined;
      const accion = typeof postback?.payload === "string" &&
        postback.payload.startsWith("ink:") && postback.payload.length <= 300
        ? postback.payload : undefined;
      const instante = evento?.timestamp;
      const proveedorId = accion ? "postback:" + createHash("sha256")
        .update(JSON.stringify([postback?.mid || instante, remitente, accion])).digest("hex") : mensaje?.mid;
      if (
        (!mensaje && !accion) ||
        mensaje?.is_self ||
        mensaje?.is_deleted ||
        (!propio && (receptor !== cuentaId || mensaje?.is_echo)) ||
        !idInstagram(remitente) ||
        remitente === cuentaId ||
        typeof proveedorId !== "string" ||
        !proveedorId ||
        proveedorId.length > 500 ||
        typeof instante !== "number" ||
        !Number.isFinite(instante) ||
        instante < 1 ||
        instante > Date.now() + 300000
      )
        continue;
      const hilo = await prisma.conversacionCanal.findUnique({
        where: {
          canal_cuentaId_remitente: {
            canal: canalInstagram,
            cuentaId,
            remitente,
          },
        },
        select: { nombre: true },
      });
      const nombre =
        hilo?.nombre ??
        ((await nombreRemitente(
          config,
          credencialInstagram(c, config),
          remitente,
        )) ||
          "Contacto " + remitente.slice(-4));
      const texto = typeof mensaje?.text === "string" ? mensaje.text.trim() : "";
      await guardarMensajeCanal({
        canal: canalInstagram,
        cuentaId,
        estudioId: c.estudioId,
        artistaId: c.artistaId,
        remitente,
        nombre,
        proveedorId,
        fecha: new Date(instante),
        ...(propio
          ? { propio: true }
          : { propio: false, destinatario: destinatario.id,
            ...(c.estudioId && Date.now() - instante < ventanaRespuesta
              ? { bot: { accion } } : {}) }),
        texto: texto?.slice(0, 4096) ||
          (accion && typeof postback?.title === "string" && postback.title.slice(0, 100)) ||
          "Este mensaje contiene contenido multimedia.",
      });
    }
  }
  if (conexionPendiente)
    throw new HttpError(503, "Instagram todavía está terminando una conexión.");
}

async function hiloPermitido(usuarioId: string, identificador: unknown) {
  const a = await resolverAmbito(usuarioId);
  if (!(await puedeUsarMensajes(a)))
    throw new HttpError(403, "No podés gestionar mensajes.");
  const hilo = await prisma.conversacionCanal.findFirst({
    where: {
      id: validarIdConsulta(identificador),
      canal: canalInstagram,
      ...filtroCanal(a),
    },
  });
  if (!hilo) throw new HttpError(404, "No encontramos la conversación.");
  return { a, hilo };
}

export async function cambiarBotInstagram(usuarioId: string, id: unknown, entrada: unknown) {
  const { activo } = objetoEntrada(entrada);
  if (typeof activo !== "boolean") throw new HttpError(400, "Indicá si querés activar el bot.");
  const { a, hilo } = await hiloPermitido(usuarioId, id);
  if (!a.estudioId || !a.administra)
    throw new HttpError(403, "Solo el titular del estudio puede cambiar el estado del bot.");

  await prisma.$transaction(async tx => {
    await bloquearConversacionCanal(tx, hilo.id);
    const where = { conversacionId: hilo.id };
    if (activo) {
      await tx.flujoInstagram.updateMany({ where, data: { pausadoAt: null } });
      return;
    }
    const ahora = new Date();
    await tx.flujoInstagram.upsert({
      where,
      create: { ...where, token: randomUUID(), enlaceHasta: ahora, pausadoAt: ahora },
      update: { pausadoAt: ahora },
    });
    await tx.conversacionCanal.update({ where: { id: hilo.id }, data: { botResponderAt: null } });
    await tx.mensajeCanal.updateMany({
      where: { conversacionId: hilo.id, botPendiente: true }, data: { botPendiente: false },
    });
  });
}

export async function responderInstagram(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const body = objetoEntrada(entrada);
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  const claveEnvio = validarIdConsulta(body.clave);
  if (!texto || texto.length > 1000)
    throw new HttpError(400, "Escribí un mensaje de hasta 1000 caracteres.");
  const { hilo } = await hiloPermitido(usuarioId, id);
  await enviarEnHiloInstagram(hilo, claveEnvio, texto);
}

export async function enviarEnHiloInstagram(
  hilo: ConversacionCanal, claveEnvio: string, texto: string, tarjetas?: TarjetaInstagram[],
) {
  async function comprobarEnvio() {
    const previo = await prisma.mensajeCanal.findUnique({
      where: { claveEnvio },
    });
    if (previo && (previo.conversacionId !== hilo.id || (!claveEnvio.startsWith("bot:") && previo.texto !== texto)))
      throw new HttpError(409, "El envío ya fue utilizado.");
    return previo?.estado;
  }
  const previo = await comprobarEnvio();
  if (previo) return previo;
  const config = configuracionInstagram();
  const conexion = await prisma.conexionCanal.findUnique({
    where: {
      canal_cuentaId: { canal: canalInstagram, cuentaId: hilo.cuentaId },
    },
  });
  if (
    !config ||
    !conexion ||
    conexion.estudioId !== hilo.estudioId ||
    conexion.artistaId !== hilo.artistaId
  )
    throw new HttpError(
      503,
      "Instagram no está conectado para esta conversación.",
    );
  const credencial = credencialInstagram(conexion, config);
  if (Date.now() - hilo.ultimaEntradaAt.getTime() >= ventanaRespuesta)
    throw new HttpError(
      409,
      "La ventana de respuesta cerró. Esperá un nuevo mensaje del cliente.",
    );

  const mensajeId = randomUUID();
  const fecha = new Date();
  const reservar = (db: Prisma.TransactionClient) => db.mensajeCanal.createMany({
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
  const reserva = claveEnvio.startsWith("bot:") && !claveEnvio.startsWith("bot:derivacion:")
    ? await prisma.$transaction(async tx => {
        await bloquearConversacionCanal(tx, hilo.id);
        const flujo = await tx.flujoInstagram.findUnique({
          where: { conversacionId: hilo.id }, select: { pausadoAt: true },
        });
        return flujo?.pausadoAt ? null : reservar(tx);
      })
    : await reservar(prisma);
  if (!reserva) throw new HttpError(409, "El bot está pausado en esta conversación.");
  const { count } = reserva;
  if (!count) {
    return (await comprobarEnvio()) ?? "ENVIANDO";
  }
  let proveedorId: string | undefined;
  let estado: EstadoMensajeCanal;
  let revocada = false;
  try {
    try {
      proveedorId = await enviarInstagram(config, credencial, hilo.remitente, texto, tarjetas);
    } catch (error) {
      if (!tarjetas || !(error instanceof HttpError) || error.status !== 422) throw error;
      proveedorId = await enviarInstagram(config, credencial, hilo.remitente, texto);
    }
    estado = "ENVIADO";
  } catch (error) {
    estado =
      error instanceof HttpError && error.status < 500 ? "ERROR" : "INCIERTO";
    revocada = error instanceof HttpError && error.status === 401;
  }
  await prisma.$transaction(async (tx) => {
    if (proveedorId) {
      await bloquearConversacionCanal(tx, hilo.id);
      // Meta puede avisar por webhook antes de responder a la solicitud de envío.
      await tx.mensajeCanal.deleteMany({
        where: {
          conversacionId: hilo.id,
          proveedorId,
          propio: true,
          claveEnvio: null,
        },
      });
    }
    await tx.mensajeCanal.update({
      where: { id: mensajeId },
      data: { estado, proveedorId },
    });
    await tx.conversacionCanal.updateMany({
      where: { id: hilo.id, ultimaActividad: { lt: fecha } },
      data: { ultimaActividad: fecha },
    });
    if (revocada)
      await tx.conexionCanal.updateMany({
        where: { id: conexion.id, tokenCifrado: conexion.tokenCifrado },
        data: { expiraAt: new Date() },
      });
  });
  return estado;
}

export async function leerInstagram(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const { hilo } = await hiloPermitido(usuarioId, id);
  const { hasta } = objetoEntrada(entrada);
  const fecha = typeof hasta === "string" ? new Date(hasta) : null;
  if (!fecha || !Number.isFinite(fecha.getTime()) || fecha > new Date())
    throw new HttpError(400, "La fecha de lectura no es válida.");
  await prisma.mensajeCanal.updateMany({
    where: {
      conversacionId: hilo.id,
      propio: false,
      leidoAt: null,
      fecha: { lte: fecha },
    },
    data: { leidoAt: new Date() },
  });
}

export async function vincularInstagram(
  usuarioId: string,
  id: unknown,
  entrada: unknown,
) {
  const { a, hilo } = await hiloPermitido(usuarioId, id);
  if (!a.administra)
    throw new HttpError(403, "Solo el titular puede vincular una consulta.");
  const valor = objetoEntrada(entrada).solicitudId;
  const solicitudId = valor === null ? null : validarIdConsulta(valor);
  if (
    solicitudId &&
    !(await prisma.solicitud.findFirst({
      where: {
        id: solicitudId,
        estudioId: hilo.estudioId,
        ...(hilo.artistaId ? { artistaDestinoId: hilo.artistaId } : {}),
      },
      select: { id: true },
    }))
  )
    throw new HttpError(404, "No encontramos la consulta en este negocio.");
  await prisma.conversacionCanal.update({
    where: { id: hilo.id },
    data: { solicitudId },
  });
}
