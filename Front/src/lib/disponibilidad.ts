import type {
  SemanaDisponible,
  FormularioBloqueo,
  DisponibilidadAgenda,
} from '../types/disponibilidad';
import { leerFecha, moverFecha } from './panel-artista';
import { fechaValida } from './agenda';
export const diasSemana = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
export const minutos = (h: string) =>
  h === '24:00' ? 1440 : Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
export function semanaInicial(): SemanaDisponible {
  return Array.from({ length: 7 }, (_, i) => ({
    dia: i + 1,
    rangos: i < 5 ? [{ desde: '09:00', hasta: '18:00' }] : [],
  }));
}
export function erroresSemana(semana: SemanaDisponible) {
  const errores: Record<string, string> = {};
  for (const d of semana) {
    const rangos = [...d.rangos].sort((a, b) => a.desde.localeCompare(b.desde));
    if (
      rangos.some(
        (r) =>
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.desde) ||
          !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(r.hasta) ||
          minutos(r.desde) >= minutos(r.hasta),
      )
    )
      errores[String(d.dia)] = 'Indicá un inicio anterior al final.';
    else if (rangos.some((r, i) => i > 0 && minutos(r.desde) < minutos(rangos[i - 1]!.hasta)))
      errores[String(d.dia)] = 'Los rangos de este día se superponen.';
  }
  return errores;
}
export function erroresBloqueo(v: FormularioBloqueo) {
  const errores: Partial<Record<keyof FormularioBloqueo, string>> = {};
  if (!v.motivo.trim() || v.motivo.trim().length > 120)
    errores.motivo = 'Ingresá un motivo de hasta 120 caracteres.';
  if (!fechaValida(v.desdeFecha)) errores.desdeFecha = 'Elegí una fecha válida.';
  if (!fechaValida(v.hastaFecha) || v.hastaFecha < v.desdeFecha)
    errores.hastaFecha = 'El final no puede ser anterior al inicio.';
  if (!v.diaCompleto) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.desdeHora))
      errores.desdeHora = 'Elegí una hora válida.';
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.hastaHora) ||
      v.hastaFecha + v.hastaHora <= v.desdeFecha + v.desdeHora
    )
      errores.hastaHora = 'El final debe ser posterior al inicio.';
  }
  return errores;
}
export function problemaReserva(
  d: DisponibilidadAgenda,
  fecha: string,
  hora: string,
  duracion: number,
) {
  if (!d.semana) return 'Configurá los horarios del artista antes de agendar.';
  const dia = leerFecha(fecha).getDay() || 7,
    desde = minutos(hora),
    hasta = desde + duracion;
  let cubierto = desde;
  for (const rango of d.semana.find((x) => x.dia === dia)?.rangos || []) {
    if (minutos(rango.desde) > cubierto) break;
    cubierto = Math.max(cubierto, minutos(rango.hasta));
    if (cubierto >= hasta) break;
  }
  if (cubierto < hasta) return 'El turno queda fuera de los horarios de atención.';
  const finFecha = hasta === 1440 ? moverFecha(fecha, 1) : fecha,
    finHora =
      hasta === 1440
        ? '00:00'
        : `${String(Math.floor(hasta / 60)).padStart(2, '0')}:${String(hasta % 60).padStart(2, '0')}`;
  const inicio = fecha + hora,
    fin = finFecha + finHora;
  if (
    d.bloqueos.some((b) => {
      const a = b.desdeFecha + (b.diaCompleto ? '00:00' : b.desdeHora),
        z =
          (b.diaCompleto ? moverFecha(b.hastaFecha, 1) : b.hastaFecha) +
          (b.diaCompleto ? '00:00' : b.hastaHora);
      return a < fin && z > inicio;
    })
  )
    return 'El artista tiene un bloqueo en ese horario.';
  return '';
}
