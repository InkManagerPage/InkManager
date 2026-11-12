import type { CitaPanel, ClientePanel, PresupuestoPanel } from '../types/panel-artista';

export const moneda = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);

export function fechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
export const leerFecha = (fecha: string) => new Date(`${fecha}T12:00:00`);
export function moverFecha(fecha: string, dias: number) {
  const dia = leerFecha(fecha);
  dia.setDate(dia.getDate() + dias);
  return fechaLocal(dia);
}
export function inicioSemana(fecha: string) {
  return moverFecha(fecha, -((leerFecha(fecha).getDay() + 6) % 7));
}
export function mostrarFecha(
  fecha: string,
  opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('es-AR', opciones).format(
    fecha.length === 10 ? leerFecha(fecha) : new Date(fecha),
  );
}
export const minutosHora = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
export function horaFin(hora: string, duracion: number) {
  const minutos = minutosHora(hora) + duracion;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

export function validarPresupuesto(datos: PresupuestoPanel): string {
  return Object.values(erroresPresupuesto(datos))[0] || '';
}
export function erroresPresupuesto(datos: PresupuestoPanel) {
  const errores: Partial<Record<keyof PresupuestoPanel, string>> = {};
  if (!Number.isFinite(datos.importe) || datos.importe <= 0 || datos.importe > 100000000)
    errores.importe = 'Ingresá un importe mayor a cero y hasta 100.000.000.';
  if (!Number.isFinite(datos.sena) || datos.sena < 0 || datos.sena > datos.importe)
    errores.sena = 'La seña debe estar entre cero y el importe total.';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(datos.validez) ||
    datos.validez < fechaLocal(new Date()) ||
    Number.isNaN(leerFecha(datos.validez).getTime()) ||
    fechaLocal(leerFecha(datos.validez)) !== datos.validez
  )
    errores.validez = 'Elegí una fecha de validez desde hoy.';
  if (datos.detalle.trim().length < 10 || datos.detalle.trim().length > 1200)
    errores.detalle = 'El detalle debe tener entre 10 y 1200 caracteres.';
  if (datos.duracionMinutos !== undefined &&
      (!Number.isInteger(datos.duracionMinutos) || datos.duracionMinutos < 30 || datos.duracionMinutos > 480))
    errores.duracionMinutos = 'Ingresá una duración de 30 a 480 minutos.';
  return errores;
}

export function validarCita(cita: Omit<CitaPanel, 'id'>, citas: CitaPanel[], id?: string): string {
  return Object.values(erroresCita(cita, citas, id))[0] || '';
}
export function erroresCita(cita: Omit<CitaPanel, 'id'>, citas: CitaPanel[], id?: string) {
  const errores: Partial<Record<keyof CitaPanel, string>> = {};
  if (!cita.clienteId) errores.clienteId = 'Elegí un cliente.';
  if (cita.titulo.trim().length < 3 || cita.titulo.trim().length > 100)
    errores.titulo = 'El trabajo debe tener entre 3 y 100 caracteres.';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(cita.fecha) ||
    Number.isNaN(leerFecha(cita.fecha).getTime()) ||
    fechaLocal(leerFecha(cita.fecha)) !== cita.fecha
  )
    errores.fecha = 'Elegí una fecha válida.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cita.hora)) errores.hora = 'Elegí una hora válida.';
  if (
    !Number.isInteger(cita.duracion) ||
    cita.duracion < 30 ||
    cita.duracion > 480 ||
    minutosHora(cita.hora) + cita.duracion > 1440
  )
    errores.duracion = 'La duración debe ser de 30 minutos a 8 horas, dentro del mismo día.';
  if (!Number.isFinite(cita.importe) || cita.importe < 0 || cita.importe > 100000000)
    errores.importe = 'Ingresá un importe entre cero y 100.000.000.';
  if (!Number.isFinite(cita.sena) || cita.sena < 0 || cita.sena > cita.importe)
    errores.sena = 'La seña debe estar entre cero y el importe total.';
  if (cita.notas.length > 1000) errores.notas = 'Las notas pueden tener hasta 1000 caracteres.';
  if (cita.estado === 'CANCELADA') return errores;
  const inicio = minutosHora(cita.hora);
  const superpuesta = citas.some(
    (otra) =>
      otra.id !== id &&
      otra.estado !== 'CANCELADA' &&
      otra.fecha === cita.fecha &&
      inicio < minutosHora(otra.hora) + otra.duracion &&
      inicio + cita.duracion > minutosHora(otra.hora),
  );
  if (superpuesta && !errores.hora)
    errores.hora = 'Ya tenés una sesión en ese horario. Elegí otro horario o día.';
  return errores;
}

export function erroresCliente(
  cliente: Omit<ClientePanel, 'id'>,
  clientes: ClientePanel[] = [],
  id?: string,
) {
  const errores: Partial<Record<keyof ClientePanel, string>> = {};
  const nombre = cliente.nombre.trim().normalize('NFC').replace(/ +/g, ' ');
  if (nombre.length < 2 || nombre.length > 80 || !/^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(nombre))
    errores.nombre = 'Ingresá entre 2 y 80 caracteres. Usá letras, espacios, apóstrofes o guiones.';
  if (cliente.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email.trim()))
    errores.email = 'Ingresá un email válido.';
  else if (
    clientes.some(
      (item) => item.id !== id && item.email.toLowerCase() === cliente.email.trim().toLowerCase(),
    )
  )
    errores.email = 'Ya tenés un cliente con ese email.';
  if (cliente.telefono && !/^[+\d\s()-]{6,30}$/.test(cliente.telefono))
    errores.telefono = 'Ingresá un teléfono de entre 6 y 30 caracteres.';
  return errores;
}

export function cantidad(valor: number, singular: string, plural = `${singular}s`) {
  return `${valor} ${valor === 1 ? singular : plural}`;
}
