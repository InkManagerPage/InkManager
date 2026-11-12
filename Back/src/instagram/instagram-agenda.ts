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
import type { TarjetaInstagram } from "./instagram.proveedor.js";

export type RespuestaBot = { texto: string; tarjetas?: TarjetaInstagram[]; aviso?: string };
const formatoHora = "HH:mm";
const rangoDias = 21;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function botonBot(title: string, payload: string) {
  return { title, payload: "ink:" + payload, type: "postback" as const };
}

function mostrarHora(fecha: DateTime) {
  return fecha.setLocale("es-AR").toFormat("ccc d/LL 'a las' HH:mm");
}

function turnoConfirmado(inicioAt: Date, zona: string): RespuestaBot {
  return { texto: "Tu turno quedó confirmado para el " +
    mostrarHora(DateTime.fromJSDate(inicioAt, { zone: zona })) +
    ". La reserva está hecha sin pago de seña." };
}

export async function agendarPorInstagram(
  titularId: string, s: SolicitudCompleta, zona: string,
  opciones: { preferencia?: PreferenciaAgenda; paginaDesde?: number; confirmacion?: string; fechaEscrita?: string } = {},
): Promise<RespuestaBot> {
  if (!s.estudioId || !s.artistaAsignadoId || s.estado !== "ASIGNADA")
    return { texto: "Primero elegí una propuesta o esperá a que el estudio asigne un artista." };

  const [cita, artista] = await Promise.all([
    prisma.cita.findFirst({ where: { solicitudId: s.id, estado: { not: "CANCELADA" } },
      orderBy: { inicioAt: "desc" }, select: { inicioAt: true, estado: true } }),
    prisma.usuario.findFirst({ where: { id: s.artistaAsignadoId, estudioId: s.estudioId,
      rol: "ARTISTA", estadoEnEstudio: "ACTIVO", suspendidoAt: null },
      select: { nombre: true, nombreArtistico: true } }),
  ]);
  if (cita) {
    if (cita.estado === "CONFIRMADA") return turnoConfirmado(cita.inicioAt, zona);
    return { texto: "Ya hay una sesión registrada para esta consulta. Si querés cambiarla o agregar otra, pedí hablar con el estudio." };
  }
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
  if (opciones.fechaEscrita) {
    const escrita = DateTime.fromFormat(opciones.fechaEscrita, "yyyy-LL-dd HH:mm", { zone: zona });
    if (escrita.toFormat("yyyy-LL-dd HH:mm") === opciones.fechaEscrita && escrita.getPossibleOffsets().length === 1)
      opciones.confirmacion = `${s.id}:${s.version}:${escrita.toMillis()}:${ahora.plus({ minutes: 1 }).toMillis()}:${randomUUID()}`;
    else
      return { texto: "No pude leer esa fecha. Escribí «horarios» para volver a ver las opciones." };
  }
  let prefijo = "";
  if (opciones.confirmacion) {
    const [consultaId, version, timestamp, expira, clave] = opciones.confirmacion.split(":");
    const inicio = DateTime.fromMillis(Number(timestamp), { zone: zona });
    if (consultaId === s.id && Number(version) === s.version && clave && uuid.test(clave) &&
        Number.isSafeInteger(Number(expira)) && Number(expira) >= ahora.toMillis() &&
        inicio.isValid && inicio > ahora && inicio <= finBusqueda) {
      try {
        const titulo = s.titulo?.trim().slice(0, 100);
        const { cita: reservada } = await crearTurno(titularId, {
          solicitudId: s.id, versionConsulta: s.version, claveCreacion: clave,
          fecha: inicio.toISODate(), hora: inicio.toFormat(formatoHora), duracion,
          titulo: titulo && titulo.length >= 3 ? titulo : "Sesión de tatuaje",
          importe: Number(presupuesto.monto), sena: Number(presupuesto.montoSena),
          estado: "CONFIRMADA", notas: "", sesionAdicional: false,
        }, "instagram");
        return turnoConfirmado(DateTime.fromISO(reservada.fecha + "T" + reservada.hora, { zone: zona }).toJSDate(), zona);
      } catch (error) {
        if (!(error instanceof HttpError) || ![400, 409].includes(error.status)) throw error;
      }
    }
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
  const horarios: DateTime[] = [];
  const primerDia = DateTime.fromMillis(desde, { zone: zona }).startOf("day");
  for (let dia = primerDia; dia <= finBusqueda && horarios.length < 4; dia = dia.plus({ days: 1 })) {
    if ((preferencia?.fecha && preferencia.fecha !== dia.toISODate()) ||
        (preferencia?.diaSemana && preferencia.diaSemana !== dia.weekday)) continue;
    const rangos = semana.find(item => item.dia === dia.weekday)?.rangos ?? [];
    for (const rango of rangos) {
      for (let minuto = minutosHorario(rango.desde); minuto < minutosHorario(rango.hasta) && horarios.length < 4; minuto += 30) {
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
  }
  if (!horarios.length)
    return { texto: prefijo + (preferencia ? "No encontré horarios con esa preferencia. Decime otro día o escribí «horarios» para ver todas las opciones." :
      "No encontré horarios libres en las próximas tres semanas. Podés pedir hablar con el estudio.") };

  const nombre = artista.nombreArtistico || artista.nombre || "tu artista";
  const expira = ahora.plus({ minutes: 30 }).toMillis();
  const primeras = horarios.slice(0, 3);
  const tarjetas: TarjetaInstagram[] = primeras.map(hora => ({
    title: mostrarHora(hora),
    subtitle: (nombre + " · " + duracion + " min").slice(0, 80),
    buttons: [botonBot("Confirmar turno", `turno:${s.id}:${s.version}:${hora.toMillis()}:${expira}:${randomUUID()}`)],
  }));
  if (horarios.length > 3)
    tarjetas.push({ title: "¿Buscás otro horario?", buttons: [botonBot("Ver más horarios",
      "agenda:" + s.id + ":" + primeras[2]!.toMillis() + ":" + encodeURIComponent(JSON.stringify(preferencia ?? {})))] });
  const texto = prefijo + "Horarios con " + nombre + ":\n" + primeras.map(mostrarHora).join("\n") +
    "\nSi no ves los botones, escribí la fecha y hora así: " + primeras[0]!.toFormat("yyyy-LL-dd HH:mm") + ".";
  return { texto, tarjetas, aviso: prefijo.trim() || undefined };
}
