import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { PreferenciaAgenda } from "../asistente/respuesta.js";
import { crearTurno } from "../citas/citas.service.js";
import { prisma } from "../config/prisma.js";
import { horarioPermitido, minutosHorario } from "../disponibilidad/disponibilidad.validation.js";
import type { SemanaDisponible } from "../disponibilidad/disponibilidad.entity.js";
import { HttpError } from "../errors/http-error.js";
import { registrarAviso } from "../operacion/avisos.repository.js";
import type { SolicitudCompleta } from "../solicitudes/solicitudes.entity.js";
import type { BotonInstagram, TarjetaInstagram } from "./instagram.proveedor.js";

export type MenuAgenda = {
  consultaId: string;
  version: number;
  expira: number;
  dias?: string[];
  fecha?: string;
  preferencia?: PreferenciaAgenda;
  confirmacion?: string;
};
export type RespuestaBot = { texto: string; tarjetas?: TarjetaInstagram[]; opciones?: BotonInstagram[]; agenda?: MenuAgenda };
const formatoHora = "HH:mm";
const rangoDias = 21;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function botonBot(title: string, payload: string) {
  return { title, payload: "ink:" + payload, type: "postback" as const };
}

function mostrarHora(fecha: DateTime) {
  return fecha.setLocale("es-AR").toFormat("ccc d/LL 'a las' HH:mm");
}

export function mensajeTurno(cita: { inicioAt: Date; estado: string }, zona: string, nueva = false) {
  const horario = mostrarHora(DateTime.fromJSDate(cita.inicioAt, { zone: zona }));
  const confirmado = cita.estado === "CONFIRMADA";
  if (nueva) return confirmado ? `Tu turno quedó confirmado para el ${horario}.`
    : `Tu turno quedó agendado para el ${horario} y está pendiente de confirmación.`;
  return `Tu próximo turno es el ${horario} y está ${confirmado ? "confirmado" : "pendiente de confirmación"}.`;
}

export function proximoTurno(solicitudId: string) {
  return prisma.cita.findFirst({
    where: { solicitudId, estado: { in: ["PENDIENTE", "CONFIRMADA"] }, inicioAt: { gt: new Date() } },
    orderBy: { inicioAt: "asc" }, select: { inicioAt: true, estado: true },
  });
}

export async function leerMenuAgenda(hiloId: string, s: SolicitudCompleta): Promise<MenuAgenda | null> {
  const mensaje = await prisma.mensajeCanal.findFirst({
    where: { conversacionId: hiloId, propio: true, estado: "ENVIADO", accionBot: { startsWith: "agenda:" } },
    orderBy: [{ fecha: "desc" }, { id: "desc" }], select: { accionBot: true },
  });
  if (!mensaje?.accionBot) return null;
  const menu: MenuAgenda = JSON.parse(mensaje.accionBot.slice("agenda:".length));
  return menu.consultaId === s.id && menu.version === s.version && menu.expira > Date.now() ? menu : null;
}

export async function agendarPorInstagram(
  titularId: string, s: SolicitudCompleta, zona: string,
  opciones: { preferencia?: PreferenciaAgenda; paginaDesde?: number; confirmacion?: string; fechaEscrita?: string;
    diaElegido?: string } = {},
): Promise<RespuestaBot> {
  if (!s.estudioId || !s.artistaAsignadoId || s.estado !== "ASIGNADA")
    return { texto: "Primero elegí una propuesta o esperá a que el estudio asigne un artista." };

  const [cita, artista] = await Promise.all([
    proximoTurno(s.id),
    prisma.usuario.findFirst({ where: { id: s.artistaAsignadoId, estudioId: s.estudioId,
      rol: "ARTISTA", estadoEnEstudio: "ACTIVO", suspendidoAt: null },
      select: { nombre: true, nombreArtistico: true } }),
  ]);
  if (cita) return { texto: mensajeTurno(cita, zona) };
  const presupuesto = s.cotizaciones.find(c => c.artistaId === s.artistaAsignadoId);
  const duracion = presupuesto?.duracionMinutos;
  if (!artista || !presupuesto || !duracion || (presupuesto.validaHasta && presupuesto.validaHasta < new Date())) {
    await registrarAviso(prisma, { usuarioId: titularId, clave: "agenda-incompleta:" + s.id, urgente: true,
      titulo: "Consulta pendiente de agenda", detalle: "Revisá el artista, la vigencia y la duración de la propuesta.",
      destino: "/estudio/consultas?consulta=" + s.id });
    return { texto: "Le avisé al estudio que tiene que revisar la propuesta antes de ofrecerte un turno." };
  }

  const ahora = DateTime.now().setZone(zona);
  const finBusqueda = ahora.plus({ days: rangoDias }).endOf("day");
  const expira = ahora.plus({ minutes: 30 }).toMillis();
  const menu = { consultaId: s.id, version: s.version, expira, preferencia: opciones.preferencia };
  const horaEscrita = opciones.fechaEscrita
    ? DateTime.fromFormat(opciones.fechaEscrita, "yyyy-LL-dd HH:mm", { zone: zona }) : null;
  if (horaEscrita && (!horaEscrita.isValid || horaEscrita.toFormat("yyyy-LL-dd HH:mm") !== opciones.fechaEscrita))
    return { texto: "No pude leer esa fecha. Escribí «horarios» para volver a ver las opciones." };
  let prefijo = "";
  if (opciones.confirmacion) {
    const [consultaId, version, timestamp, expira, clave] = opciones.confirmacion.split(":");
    const inicio = DateTime.fromMillis(Number(timestamp), { zone: zona });
    if (consultaId === s.id && Number(version) === s.version && clave && uuid.test(clave) &&
        Number.isSafeInteger(Number(expira)) && Number(expira) >= ahora.toMillis() &&
      inicio.isValid && inicio > ahora && inicio <= finBusqueda && inicio.getPossibleOffsets().length === 1) {
      try {
        const titulo = s.titulo?.trim().slice(0, 100);
        const { cita: reservada } = await crearTurno(titularId, {
          solicitudId: s.id, versionConsulta: s.version, claveCreacion: clave,
          fecha: inicio.toISODate(), hora: inicio.toFormat(formatoHora), duracion,
          titulo: titulo && titulo.length >= 3 ? titulo : "Sesión de tatuaje",
          importe: Number(presupuesto.monto), sena: Number(presupuesto.montoSena),
          estado: "CONFIRMADA", notas: "", sesionAdicional: false,
        }, "instagram");
        return { texto: mensajeTurno({ estado: reservada.estado, inicioAt: inicio.toJSDate() }, zona, true) };
      } catch (error) {
        if (!(error instanceof HttpError) || ![400, 409].includes(error.status)) throw error;
      }
    }
    const reservada = await proximoTurno(s.id);
    if (reservada) return { texto: mensajeTurno(reservada, zona) };
    const fechaAnterior = inicio.isValid ? inicio.toISODate() : null;
    if (fechaAnterior && !opciones.diaElegido && inicio > ahora && inicio <= finBusqueda)
      opciones.diaElegido = fechaAnterior;
    prefijo = "Ese horario ya no está disponible. ";
  }

  const desde = Math.max(ahora.toMillis(), opciones.paginaDesde ?? 0);
  const [agenda, ocupados] = await Promise.all([
    prisma.disponibilidadArtista.findUnique({
      where: { artistaId_ambito: { artistaId: s.artistaAsignadoId, ambito: s.estudioId } },
      select: { semana: true, bloqueos: { where: { canceladoAt: null, finAt: { gt: new Date(desde) },
        inicioAt: { lt: finBusqueda.toJSDate() } }, select: { inicioAt: true, finAt: true } } },
    }),
    prisma.cita.findMany({
      where: { artistaId: s.artistaAsignadoId, estado: { not: "CANCELADA" }, finAt: { gt: new Date(desde) },
        inicioAt: { lt: finBusqueda.toJSDate() } }, select: { inicioAt: true, finAt: true },
    }),
  ]);
  if (!Array.isArray(agenda?.semana)) {
    await registrarAviso(prisma, { usuarioId: titularId, clave: "sin-horarios:" + s.id, urgente: true,
      titulo: "Artista sin horarios configurados", detalle: artista.nombreArtistico || artista.nombre || "Consulta de Instagram",
      destino: "/estudio/consultas?consulta=" + s.id });
    return { texto: "Le avisé al estudio que todavía tiene que cargar los horarios de este artista." };
  }

  const semana = agenda.semana as unknown as SemanaDisponible;
  const bloqueados = [...agenda.bloqueos, ...ocupados];
  const preferencia = opciones.preferencia;
  const fecha = opciones.diaElegido ?? horaEscrita?.toISODate() ?? preferencia?.fecha;
  const horarios: DateTime[] = [];
  const dias: string[] = [];
  const primerDia = DateTime.fromMillis(desde, { zone: zona }).startOf("day");
  for (let dia = primerDia; dia <= finBusqueda; dia = dia.plus({ days: 1 })) {
    const diaIso = dia.toISODate()!;
    if ((fecha && fecha !== diaIso) ||
        (preferencia?.diaSemana && preferencia.diaSemana !== dia.weekday)) continue;
    const cantidadInicial = horarios.length;
    const rangos = semana.find(item => item.dia === dia.weekday)?.rangos ?? [];
    for (const rango of rangos) {
      for (let minuto = minutosHorario(rango.desde); minuto < minutosHorario(rango.hasta); minuto += 30) {
        const inicio = dia.set({ hour: Math.floor(minuto / 60), minute: minuto % 60 });
        const fin = inicio.plus({ minutes: duracion });
        if (inicio.toMillis() <= desde || inicio.hour * 60 + inicio.minute !== minuto ||
            inicio.getPossibleOffsets().length > 1 ||
            (preferencia?.desde && inicio.toFormat(formatoHora) < preferencia.desde) ||
            (preferencia?.hasta && (fin.day !== inicio.day || fin.toFormat(formatoHora) > preferencia.hasta)) ||
            !horarioPermitido(semana, inicio.toJSDate(), fin.toJSDate(), zona)) continue;
        if (bloqueados.some(b => b.inicioAt < fin.toJSDate() && b.finAt > inicio.toJSDate())) continue;
        horarios.push(inicio);
      }
    }
    if (horarios.length > cantidadInicial) dias.push(diaIso);
  }
  if (!horarios.length)
    return { texto: prefijo + (fecha || preferencia ? "No encontré horarios con esa preferencia. Decime otro día o escribí «horarios» para ver todas las opciones." :
      "No encontré horarios libres en las próximas tres semanas. Podés pedir hablar con el estudio.") };

  if (horaEscrita) {
    const elegida = horarios.find(hora => hora.equals(horaEscrita));
    if (elegida) {
      return { texto: `Elegiste el ${mostrarHora(elegida)}. Respondé «confirmar» para reservar o «horarios» para cambiar.`,
        agenda: { ...menu, fecha, confirmacion: `${s.id}:${s.version}:${elegida.toMillis()}:${expira}:${randomUUID()}` } };
    }
    prefijo = "Ese horario ya no está disponible. ";
  }
  const nombre = artista.nombreArtistico || artista.nombre || "tu artista";
  if (fecha) {
    const horas = horarios.map(hora => hora.toFormat(formatoHora));
    return { texto: `${prefijo}Horarios con ${nombre} para el ${horarios[0]!.setLocale("es-AR").toFormat("cccc d/LL")}:\n${horas.join(" · ")}\nRespondé con la hora que preferís, por ejemplo «${horas[0]}».`,
      agenda: { ...menu, fecha } };
  }
  const lista = dias.map((valor, indice) =>
    `D${indice + 1}. ${DateTime.fromISO(valor, { zone: zona }).setLocale("es-AR").toFormat("cccc d/LL")}`);
  return { texto: `${prefijo}¿Qué día te queda bien con ${nombre}?\n${lista.join("\n")}\nRespondé con el código del día, por ejemplo «D1».`,
    agenda: { ...menu, dias } };
}
