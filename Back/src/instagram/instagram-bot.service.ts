import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { ConversacionCanal, EstadoMensajeCanal, Prisma } from "@prisma/client";
import { leerConfiguracionAsistente } from "../asistente/asistente.repository.js";
import { generarRespuestaAsistente, pruebaAsistenteDisponible } from "../asistente/respuesta.js";
import { origenesPermitidos } from "../config/auth.js";
import { prisma } from "../config/prisma.js";
import { titularConPlan } from "../pagos/acceso-plan.js";
import { HttpError } from "../errors/http-error.js";
import { bloquearConversacionCanal, ventanaRespuesta } from "../mensajes/mensajes.repository.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import { detalleSolicitud, type SolicitudCompleta } from "../solicitudes/solicitudes.entity.js";
import { cotizacionesVigentes } from "../solicitudes/solicitudes.service.js";
import { cerrarVencidasDelAmbito } from "../solicitudes/solicitudes.repository.js";
import { configuracionInstagram, type BotonInstagram, type TarjetaInstagram } from "./instagram.proveedor.js";
import { agendarPorInstagram, botonBot, leerMenuAgenda, mensajeTurno, proximoTurno, turnosParaAsistente, type RespuestaBot } from "./instagram-agenda.js";
import { notificarTurnosInstagram } from "./instagram-turnos.repository.js";

export type EnviarBot = (hilo: ConversacionCanal, clave: string, texto: string,
  formato?: { tarjetas?: TarjetaInstagram[]; opciones?: BotonInstagram[]; agenda?: string },
) => Promise<EstadoMensajeCanal>;
const dia = 24 * 60 * 60 * 1000;
const ayuda = () => pruebaAsistenteDisponible()
  ? "Podés consultar por acá o pedir hablar con el estudio."
  : "Escribí PRESUPUESTO para ver tu consulta o HUMANO para hablar con el estudio.";
const pedirTurno = () => "Escribí «horarios» para agendar tu turno.";

export function interpretarMensajeBot(texto: string) {
  const mensaje = texto.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase()
    .replace(/^[¿¡]+|[!?.]+$/g, "").trim();
  const opcion = /^(?:(?:la|el|opcion|propuesta|elegir(?: propuesta)?)\s+)?([0-9]{1,3}|[a-f0-9]{8})(?:\s*[,.-]\s*[^\d].*)?$/.exec(mensaje);
  if (opcion || /^elegir\b/.test(mensaje)) return { tipo: "ELEGIR", codigo: opcion?.[1] ?? "" } as const;
  const detalle = /^(?:ver )?detalle(?: de (?:la )?propuesta)? (\d{1,3})$/.exec(mensaje);
  if (detalle) return { tipo: "DETALLE", numero: Number(detalle[1]) } as const;
  if (/^(confirmar(?: turno)?|confirmo(?: el turno)?)$/.test(mensaje)) return { tipo: "CONFIRMAR" } as const;
  const dia = /^(?:d|dia\s+)(\d{1,2})$/.exec(mensaje);
  if (dia) return { tipo: "DIA", indice: Number(dia[1]) - 1 } as const;
  const semana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const diaSemana = /^(?:(?:el|para el) )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)$/.exec(mensaje);
  if (diaSemana) return { tipo: "DIA_SEMANA", dia: semana.indexOf(diaSemana[1]!) + 1 } as const;
  const fechaLocal = /^(?:(?:el|para el|lunes|martes|miercoles|jueves|viernes|sabado|domingo) )?(\d{1,2})\/(\d{1,2})(?: a las (\d{1,2})(?::([0-5]\d))?)?$/.exec(mensaje);
  if (fechaLocal)
    return { tipo: "DIA_FECHA", dia: Number(fechaLocal[1]), mes: Number(fechaLocal[2]),
      hora: fechaLocal[3] ? fechaLocal[3].padStart(2, "0") + ":" + (fechaLocal[4] ?? "00") : undefined } as const;
  const hora = /^(?:(?:a )?las (\d{1,2})(?::([0-5]\d))?|(\d{1,2}):([0-5]\d))$/.exec(mensaje);
  const horas = hora?.[1] ?? hora?.[3];
  if (hora && horas && Number(horas) < 24)
    return { tipo: "HORA", hora: horas.padStart(2, "0") + ":" + (hora[2] ?? hora[4] ?? "00") } as const;
  if (/\b(?:mi (?:turno|cita|sesion)|tengo (?:turno|cita|sesion)|es (?:el|la) (?:turno|cita|sesion))\b/.test(mensaje) &&
      /\b(?:cuando|hora|horario|dia|fecha|confirmad[oa])\b/.test(mensaje))
    return { tipo: "ESTADO_TURNO" } as const;
  const horario = /^(?:turno )?(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$/.exec(mensaje);
  if (horario) return { tipo: "FECHA", fecha: horario[1]! } as const;
  if (/^(humano|asesor|hablar con (el )?estudio|hablar con (una )?persona)$/.test(mensaje))
    return { tipo: "HUMANO" } as const;
  if (/^(turno|horarios|ver horarios|ver mas horarios|pedir turno|agendar|quiero (un )?turno)$/.test(mensaje))
    return { tipo: "TURNO" } as const;
  if (/^(hola|buen dia|buenos dias|buenas(?: tardes| noches)?)(?:$|[\s,!.?])/.test(mensaje) ||
    /^(presupuesto|cotizacion|estado|formulario|quiero (?:pedir )?(?:un )?presupuesto)$/.test(mensaje))
    return { tipo: "CONSULTAR" } as const;
  return null;
}

function opcionesDe(solicitud: SolicitudCompleta) {
  return cotizacionesVigentes(solicitud).map(c => ({
    ...c, codigo: c.id.slice(0, 8).toLowerCase(),
    numero: solicitud.cotizaciones.findIndex(p => p.id === c.id) + 1,
    nombre: (c.artista.nombreArtistico || c.artista.nombre || "Artista").slice(0, 45),
  }));
}

function moneda(s: SolicitudCompleta, monto: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: s.moneda || "ARS", currencyDisplay: "code" }).format(monto);
}

function mostrarOpciones(s: SolicitudCompleta, pagina = 0): RespuestaBot {
  const asignada = s.estado === "ASIGNADA";
  const opciones = opcionesDe(s).filter(c => !asignada || c.artistaId === s.artistaAsignadoId);
  if (!opciones.length) return { texto: asignada ? "Ya hay un artista asignado. " + pedirTurno() : "Las propuestas ya no están disponibles. " + ayuda() };
  const primeras = opciones.slice(pagina, pagina + 8);
  if (!primeras.length) return mostrarOpciones(s);
  const tarjetas: TarjetaInstagram[] = primeras.map(c => ({
    title: `${c.numero}. ${c.nombre} · ${moneda(s, Number(c.monto))}`.slice(0, 80),
    subtitle: `Seña ${moneda(s, Number(c.montoSena))} · ${c.mensaje || ""}`.slice(0, 80),
    ...(c.bocetoUrl?.startsWith("https://") && { image_url: c.bocetoUrl }),
    buttons: [
      botonBot(`Detalle ${c.numero}`, `detalle:${s.version}:${c.id}`),
      asignada ? botonBot("Ver horarios", "agenda:" + s.id) :
        botonBot(`Elegir propuesta ${c.numero}`, `propuesta:${s.version}:${c.id}`),
    ],
  }));
  if (pagina + 8 < opciones.length)
    tarjetas.push({ title: "Más propuestas", buttons: [botonBot("Ver más", `propuestas:${s.id}:${pagina + 8}`)] });
  const lista = primeras.map(c =>
    `${c.numero}. ${c.nombre} · ${moneda(s, Number(c.monto))}`).join("\n");
  const botones = asignada ? undefined : primeras.map(c => botonBot(`Elegir ${c.numero}`, `propuesta:${s.version}:${c.id}`));
  return { tarjetas, opciones: botones, texto: (asignada ? "La propuesta de tu artista:\n" : "Estas son las propuestas vigentes:\n") +
    lista + (asignada ? "\n" + pedirTurno() :
      "\nPara elegir, respondé con el número. Para leer la descripción, escribí «detalle " + primeras[0]!.numero + "».") };
}

function estadoSolicitud(solicitud: SolicitudCompleta): RespuestaBot {
  if (solicitud.estado === "ELECCION_CLIENTE" || solicitud.estado === "ASIGNADA")
    return mostrarOpciones(solicitud);
  if (solicitud.estado === "POR_ASIGNAR")
    return { texto: "Le avisé al estudio que todavía no hay propuestas. El equipo va a revisar quién puede tomar tu consulta." };
  return { texto: "Ya recibimos tu consulta. El estudio está preparando las propuestas. " + ayuda() };
}

async function enviarRespuesta(enviar: EnviarBot, hilo: ConversacionCanal, clave: string, respuesta: RespuestaBot) {
  if (respuesta.tarjetas)
    await enviar(hilo, clave + ":tarjetas", "Tarjetas de las propuestas.", { tarjetas: respuesta.tarjetas });
  return enviar(hilo, clave, respuesta.texto, { opciones: respuesta.opciones,
    agenda: respuesta.agenda ? "agenda:" + JSON.stringify(respuesta.agenda) : undefined });
}

async function iniciarFlujo(hilo: ConversacionCanal) {
  return prisma.$transaction(async tx => {
    await bloquearConversacionCanal(tx, hilo.id);
    const actual = await tx.conversacionCanal.findUniqueOrThrow({
      where: { id: hilo.id }, include: { flujoInstagram: true, solicitud: { select: { estado: true } } },
    });
    if (actual.solicitudId && actual.solicitud?.estado !== "ARCHIVADA" &&
      actual.solicitud?.estado !== "CANCELADO") return null;

    const ahora = new Date();
    const previo = actual.flujoInstagram;
    if (previo && !actual.solicitudId && !previo.solicitudId && previo.enlaceHasta > ahora) return previo;
    const nuevo = { token: randomUUID(), enlaceHasta: new Date(ahora.getTime() + dia),
      solicitudId: null, pausadoAt: previo?.pausadoAt ?? null,
      recepcionAt: null, versionAvisada: null, revisadoAt: ahora };
    if (actual.solicitudId)
      await tx.conversacionCanal.update({ where: { id: hilo.id }, data: { solicitudId: null } });
    return tx.flujoInstagram.upsert({
      where: { conversacionId: hilo.id }, create: { conversacionId: hilo.id, ...nuevo }, update: nuevo,
    });
  });
}

async function elegirPropuesta(hilo: ConversacionCanal, titularId: string,
  elegir: { codigo?: string; propuestaId?: string; version?: number },
): Promise<RespuestaBot & { elegida?: SolicitudCompleta }> {
  return prisma.$transaction(async tx => {
    await bloquearConversacionCanal(tx, hilo.id);
    const flujo = await tx.flujoInstagram.findUnique({
      where: { conversacionId: hilo.id }, include: { conversacion: { select: { solicitudId: true } } },
    });
    const id = flujo?.solicitudId;
    if (!id || flujo.pausadoAt || flujo.conversacion.solicitudId !== id)
      return { texto: "Para elegir una propuesta, necesitás una consulta activa en este chat. " + ayuda() };
    await tx.$queryRaw`SELECT "id" FROM "Solicitud" WHERE "id" = ${id} FOR UPDATE`;
    const solicitud = await tx.solicitud.findFirst({
      where: { id, estudioId: hilo.estudioId, canal: "INSTAGRAM" }, include: detalleSolicitud,
    });
    if (!solicitud) return { texto: "No encontramos la consulta de este chat. " + ayuda() };
    if (solicitud.estado !== "ELECCION_CLIENTE") return estadoSolicitud(solicitud);
    const vigentes = mostrarOpciones(solicitud);
    const avisoError = "No pude elegir esa propuesta. Revisá las opciones vigentes.";
    const noDisponible = { ...vigentes, texto: avisoError + "\n" + vigentes.texto };
    const opciones = opcionesDe(solicitud).filter(c => elegir.propuestaId
      ? elegir.version === solicitud.version && c.id === elegir.propuestaId
      : c.codigo === elegir.codigo || String(c.numero) === elegir.codigo);
    if (opciones.length !== 1) return noDisponible;
    const opcion = opciones[0]!;
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${opcion.artistaId} FOR SHARE`;
    const artista = await tx.usuario.findFirst({
      where: { id: opcion.artistaId, estudioId: hilo.estudioId, rol: "ARTISTA", estadoEnEstudio: "ACTIVO", suspendidoAt: null },
      select: { id: true },
    });
    if (!artista || (opcion.validaHasta && opcion.validaHasta < new Date()))
      return noDisponible;
    const actualizada = await tx.solicitud.update({
      where: { id }, data: { artistaAsignadoId: artista.id, estado: "ASIGNADA",
        asignadaPor: "CLIENTE", version: { increment: 1 } },
      include: detalleSolicitud,
    });
    await tx.flujoInstagram.update({ where: { conversacionId: hilo.id }, data: { versionAvisada: actualizada.version } });
    const aviso = { clave: "eleccion:" + id, titulo: "El cliente eligió una propuesta", detalle: solicitud.titulo };
    await registrarAviso(tx, { ...aviso, usuarioId: titularId, destino: "/estudio/consultas?consulta=" + id });
    await registrarAviso(tx, { ...aviso, usuarioId: artista.id, destino: "/artista/consultas?consulta=" + id });
    return { texto: `Quedó confirmada tu elección de ${opcion.nombre}.`, elegida: actualizada };
  });
}

export async function procesarMensajeBot(
  id: string, titularId: string, proveedorId: string, texto: string, enviar: EnviarBot,
  accionBot?: string, vigente?: () => Promise<boolean>,
) {
  const mensaje = texto.trim();
  if (!mensaje && !accionBot) return;
  const comando = interpretarMensajeBot(mensaje);
  const conIa = pruebaAsistenteDisponible();
  const clave = `bot:respuesta:${id}:${proveedorId}`;
  if (await prisma.mensajeCanal.findUnique({ where: { claveEnvio: clave }, select: { id: true } })) return;
  const hilo = await prisma.conversacionCanal.findUnique({
    where: { id },
    include: { estudio: { select: { slug: true, propietarioId: true, zonaHoraria: true } }, flujoInstagram: true },
  });
  if (!hilo?.estudioId || hilo.canal !== "INSTAGRAM" || hilo.estudio?.propietarioId !== titularId ||
    Date.now() - hilo.ultimaEntradaAt.getTime() >= ventanaRespuesta) return;

  const flujo = hilo.flujoInstagram;
  if (flujo?.pausadoAt) return;
  if (vigente && !(await vigente())) return false;
  const zona = hilo.estudio.zonaHoraria || "America/Argentina/Buenos_Aires";
  const responder = async (respuesta: RespuestaBot) => {
    if (vigente && !(await vigente())) return;
    return enviarRespuesta(enviar, hilo, clave, respuesta);
  };
  let consultaCargada: Promise<SolicitudCompleta | null> | undefined;
  const consulta = () => consultaCargada ??= hilo.solicitudId
    ? prisma.solicitud.findFirst({
        where: { id: hilo.solicitudId, estudioId: hilo.estudioId,
          conversacionesCanal: { some: { id: hilo.id } },
          estado: { notIn: ["ARCHIVADA", "CANCELADO"] } },
        include: detalleSolicitud,
      })
    : Promise.resolve(null);
  const agenda = async (opciones?: Parameters<typeof agendarPorInstagram>[3]) => {
    const s = await consulta();
    return s ? agendarPorInstagram(titularId, s, zona, opciones) :
      { texto: "Primero necesitás una consulta con un artista asignado. Podés pedir el formulario por acá." };
  };
  const elegir = async (datos: Parameters<typeof elegirPropuesta>[2]) => {
    const resultado = await elegirPropuesta(hilo, titularId, datos);
    if (!resultado.elegida) return responder(resultado);
    const horarios = await agendarPorInstagram(titularId, resultado.elegida, zona);
    return responder({ ...horarios, texto: resultado.texto + "\n" + horarios.texto });
  };
  const estadoTurno = async () => {
    const s = await consulta();
    const cita = s ? await proximoTurno(s.id) : null;
    return { texto: cita ? mensajeTurno(cita, zona) :
      "Todavía no veo un turno próximo en este chat. Escribí «horarios» para ver las opciones o pedí hablar con el estudio." };
  };
  const mostrarDetalle = async (s: SolicitudCompleta, numero?: number, id?: string, version?: number) => {
    const propuesta = opcionesDe(s).find(c =>
      (numero !== undefined ? c.numero === numero : c.id === id && version === s.version) &&
      (s.estado === "ELECCION_CLIENTE" || (s.estado === "ASIGNADA" && c.artistaId === s.artistaAsignadoId)));
    if (!propuesta) {
      const estado = estadoSolicitud(s);
      await responder({ ...estado, texto: "Esa propuesta cambió o venció. " + estado.texto });
      return;
    }
    const detalle = `${propuesta.nombre} · ${moneda(s, Number(propuesta.monto))}\n` +
      `Seña informada ${moneda(s, Number(propuesta.montoSena))}\n` +
      (propuesta.duracionMinutos ? `Duración estimada: ${propuesta.duracionMinutos} min\n` : "") +
      (propuesta.mensaje || "Sin detalle adicional.") +
      (propuesta.bocetoUrl?.startsWith("https://") ? "\nBoceto: " + propuesta.bocetoUrl : "");
    if (detalle.length > 900) {
      await enviar(hilo, clave + ":detalle", detalle.slice(0, 900));
      await responder({ texto: detalle.slice(900) });
    } else {
      await responder({ texto: detalle });
    }
  };
  if (accionBot) {
    const [, tipo, ...valores] = accionBot.split(":");
    if (tipo === "propuesta") {
      await elegir({ version: Number(valores[0]), propuestaId: valores[1] });
      return;
    }
    const s = await consulta();
    if (!s) {
      await responder({ texto: "Esa opción ya no está disponible para este chat." });
      return;
    }
    if (tipo === "detalle") {
      await mostrarDetalle(s, undefined, valores[1], Number(valores[0]));
      return;
    }
    if (tipo === "propuestas" && valores[0] === s.id) {
      const pagina = Number(valores[1]);
      await responder(mostrarOpciones(s, Number.isInteger(pagina) && pagina >= 0 ? pagina : 0));
      return;
    }
    if (tipo === "agenda" && valores[0] === s.id) {
      let preferencia;
      try {
        preferencia = valores[2] ? JSON.parse(decodeURIComponent(valores[2])) : undefined;
      } catch { /* Se vuelve a buscar desde el horario indicado. */ }
      const paginaDesde = Number(valores[1]);
      await responder(await agendarPorInstagram(titularId, s, zona, {
        paginaDesde: Number.isFinite(paginaDesde) ? paginaDesde : undefined,
        preferencia,
      }));
      return;
    }
    if (tipo === "turno") {
      await responder(await agendarPorInstagram(titularId, s, zona, { confirmacion: valores.join(":") }));
      return;
    }
    await responder({ texto: "Esa opción ya no está disponible. Escribí «estado» para ver tu consulta." });
    return;
  }
  if (comando?.tipo === "ELEGIR") {
    await elegir({ codigo: comando.codigo });
    return;
  }
  if (comando?.tipo === "DETALLE") {
    const s = await consulta();
    if (s) await mostrarDetalle(s, comando.numero);
    else await responder({ texto: "No veo una consulta activa vinculada a este chat." });
    return;
  }
  if (comando?.tipo === "DIA_SEMANA") {
    const s = await consulta();
    const menu = s ? await leerMenuAgenda(hilo.id, s) : null;
    const fecha = menu?.dias?.find(dia => DateTime.fromISO(dia, { zone: zona }).weekday === comando.dia);
    await responder(await agenda(fecha ? { diaElegido: fecha, preferencia: menu?.preferencia } :
      { preferencia: { diaSemana: comando.dia } }));
    return;
  }
  if (comando?.tipo === "DIA" || comando?.tipo === "DIA_FECHA" || comando?.tipo === "HORA" || comando?.tipo === "CONFIRMAR") {
    const s = await consulta();
    const menu = s ? await leerMenuAgenda(hilo.id, s) : null;
    let fecha = comando.tipo === "DIA" ? menu?.dias?.[comando.indice] : undefined;
    if (comando.tipo === "DIA_FECHA" && menu) {
      const dias = menu.dias ?? (menu.fecha ? [menu.fecha] : []);
      fecha = dias.find(valor => {
        const dia = DateTime.fromISO(valor, { zone: zona });
        return dia.day === comando.dia && dia.month === comando.mes;
      });
      if (fecha && comando.hora) {
        await responder(await agenda({ fechaEscrita: fecha + " " + comando.hora, preferencia: menu.preferencia }));
        return;
      }
    }
    if (fecha) await responder(await agenda({ diaElegido: fecha, preferencia: menu?.preferencia }));
    else if (comando.tipo === "CONFIRMAR" && menu?.confirmacion)
      await responder(await agenda({ confirmacion: menu.confirmacion, preferencia: menu.preferencia }));
    else if (comando.tipo === "HORA" && menu?.fecha)
      await responder(await agenda({ fechaEscrita: menu.fecha + " " + comando.hora, preferencia: menu.preferencia }));
    else if (comando.tipo === "CONFIRMAR" && s && await proximoTurno(s.id))
      await responder(await estadoTurno());
    else
      await responder({ texto: "Esa opción ya no está disponible. Escribí «horarios» para elegir día y hora." });
    return;
  }
  if (comando?.tipo === "FECHA" || comando?.tipo === "TURNO") {
    await responder(await agenda(comando.tipo === "FECHA" ? { fechaEscrita: comando.fecha } : undefined));
    return;
  }
  if (!comando && (!conIa || /^\S{1,24}$/.test(mensaje))) {
    const s = await consulta();
    if (s?.estado === "ELECCION_CLIENTE") {
      const aviso = "Si querías elegir una propuesta, tocá el botón o escribí su número.";
      const vigentes = mostrarOpciones(s);
      await responder({ ...vigentes, texto: aviso + "\n" + vigentes.texto });
      return;
    }
    if (!conIa) return;
  }
  let decision;
  if (conIa && comando?.tipo !== "HUMANO") {
    try {
      const [configuracion, artistas, turnos] = await Promise.all([
        leerConfiguracionAsistente({ estudioId: hilo.estudioId }),
        prisma.usuario.findMany({
          where: { estudioId: hilo.estudioId, rol: "ARTISTA", estadoEnEstudio: "ACTIVO", suspendidoAt: null },
          select: { nombre: true, nombreArtistico: true, estilosPrincipales: true },
          orderBy: { nombre: "asc" },
        }),
        consulta().then(s => s ? turnosParaAsistente(s, zona) : undefined),
      ]);
      decision = await generarRespuestaAsistente(configuracion, mensaje.slice(0, 3000), {
        zonaHoraria: zona,
        turnos,
        artistasActivos: artistas.map(a => ({
          nombre: a.nombreArtistico || a.nombre || "Artista", estilos: a.estilosPrincipales,
        })),
      });
    } catch {
      console.error("No pudimos generar la respuesta automática de Instagram.");
      if (!comando) {
        if (vigente && !(await vigente())) return false;
        const s = await consulta();
        await responder(s ? estadoSolicitud(s) : { texto: "No pude procesar tu mensaje. Escribí «presupuesto» o «humano» para seguir." });
        return;
      }
    }
    if (vigente && !(await vigente())) return false;
    const sigueVigente = await prisma.conversacionCanal.findFirst({
      where: {
        id,
        estudioId: hilo.estudioId,
        solicitudId: hilo.solicitudId,
        estudio: { propietarioId: titularId },
        ultimaEntradaAt: hilo.ultimaEntradaAt,
        OR: [{ flujoInstagram: null }, { flujoInstagram: { pausadoAt: null } }],
      },
      select: { id: true },
    });
    if (!sigueVigente) return vigente ? false : undefined;
  }
  if (decision?.accion === "RESPONDER") {
    await responder({ texto: decision.texto });
    return;
  }
  const accion = decision?.accion ?? comando?.tipo;
  if (accion === "ESTADO_TURNO") {
    await responder(await estadoTurno());
    return;
  }
  if (accion === "TURNO") {
    await responder(await agenda({ preferencia: decision?.agenda }));
    return;
  }
  if (accion === "DERIVAR" || accion === "HUMANO") {
    const ahora = new Date();
    const derivo = await prisma.$transaction(async tx => {
      await bloquearConversacionCanal(tx, id);
      const actual = await tx.flujoInstagram.findUnique({
        where: { conversacionId: id }, select: { pausadoAt: true },
      });
      if (actual?.pausadoAt) return false;
      await tx.flujoInstagram.upsert({
        where: { conversacionId: id },
        create: { conversacionId: id, token: randomUUID(), enlaceHasta: ahora, pausadoAt: ahora },
        update: { pausadoAt: ahora },
      });
      await registrarAviso(tx, { usuarioId: titularId, clave,
        titulo: "Un cliente pide hablar con el estudio",
        detalle: hilo.nombre, destino: "/estudio/mensajes?conversacion=" + id });
      return true;
    });
    if (derivo)
      await enviar(hilo, `bot:derivacion:${id}:${proveedorId}`,
        "Le avisé al estudio. Una persona va a seguir la conversación por acá.");
    return;
  }
  const solicitud = await consulta();
  if (solicitud) {
    await responder(estadoSolicitud(solicitud));
    return;
  }
  if (accion === "ESTADO") {
    await responder({ texto: "No encontré una consulta activa asociada a este chat. Podés pedirme el formulario para iniciar una." });
    return;
  }
  const nuevo = await iniciarFlujo(hilo);
  if (!nuevo) {
    await responder({ texto: "Ya hay una consulta vinculada a este chat. " + ayuda() });
    return;
  }
  const url = new URL("/cotizacion/" + encodeURIComponent(hilo.estudio.slug), origenesPermitidos[0]);
  url.searchParams.set("ig", nuevo.token);
  const introduccion = decision?.accion === "FORMULARIO"
    ? decision.texto
    : "Completá este formulario para pedir un presupuesto.";
  await responder({ texto: `${introduccion}\n${url.href}\nDespués seguimos por acá.` });
}

export function iniciarBotInstagram(enviar: EnviarBot) {
  if (!configuracionInstagram()) return;
  let ejecutando = false;
  const revisar = async () => {
    if (ejecutando) return;
    ejecutando = true;
    try {
      await cerrarVencidasDelAmbito(undefined, true);
      await notificarConsultas(enviar);
      await notificarTurnosInstagram(enviar);
    } catch {
      console.error("No pudimos revisar las respuestas del bot de Instagram.");
    } finally {
      ejecutando = false;
    }
  };
  setInterval(() => void revisar(), 20000).unref();
}

export async function notificarConsultas(enviar: EnviarBot) {
  const ahora = new Date();
  const conexionVigente = {
    canal: "INSTAGRAM",
    activa: true,
    tokenCifrado: { not: null },
    OR: [{ expiraAt: { gt: ahora } }, { expiraAt: null, loginUnificado: true }],
  } satisfies Prisma.ConexionCanalWhereInput;
  const flujos = await prisma.flujoInstagram.findMany({
    where: { pausadoAt: null, solicitudId: { not: null },
      conversacion: {
        canal: "INSTAGRAM",
        botResponderAt: null,
        ultimaEntradaAt: { gt: new Date(ahora.getTime() - ventanaRespuesta) },
        estudio: {
          propietario: titularConPlan(ahora),
          conexionesCanal: { some: conexionVigente },
        },
      },
      OR: [{ recepcionAt: null }, { solicitud: { estado: { in: ["ELECCION_CLIENTE", "ASIGNADA", "POR_ASIGNAR"] } } }],
    },
    include: {
      conversacion: {
        include: { estudio: { select: { conexionesCanal: { where: conexionVigente, select: { cuentaId: true } } } } },
      },
      solicitud: { include: detalleSolicitud },
    },
    orderBy: { revisadoAt: "asc" }, take: 20,
  });
  for (const f of flujos) {
    const s = f.solicitud;
    const hilo = f.conversacion;
    if (!s || hilo.solicitudId !== s.id || s.estudioId !== hilo.estudioId) continue;
    const where = { conversacionId: f.conversacionId, solicitudId: s.id, pausadoAt: null };
    if (!(await prisma.flujoInstagram.updateMany({ where, data: { revisadoAt: ahora } })).count) continue;
    if (!hilo.estudio?.conexionesCanal.some(c => c.cuentaId === hilo.cuentaId)) continue;
    try {
      if (!f.recepcionAt) {
        const recibido = await enviar(f.conversacion, `bot:recibida:${s.id}`,
          "Ya recibimos tu idea para el tatuaje. Te vamos a escribir por acá cuando haya novedades. " + ayuda());
        if (recibido !== "ENVIADO") continue;
        await prisma.flujoInstagram.updateMany({ where, data: { recepcionAt: ahora } });
      }
      if (["ELECCION_CLIENTE", "ASIGNADA", "POR_ASIGNAR"].includes(s.estado) && f.versionAvisada !== s.version) {
        const sigueVigente = await prisma.flujoInstagram.findFirst({
          where: { ...where, solicitud: { version: s.version }, conversacion: { solicitudId: s.id } },
          select: { conversacionId: true },
        });
        if (!sigueVigente) continue;
        const estado = await enviarRespuesta(enviar, f.conversacion, `bot:estado:${s.id}:${s.version}`, estadoSolicitud(s));
        if (estado === "ENVIADO")
          await prisma.flujoInstagram.updateMany({ where, data: { versionAvisada: s.version } });
      }
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("No pudimos procesar una respuesta de Instagram.");
    }
  }
}
