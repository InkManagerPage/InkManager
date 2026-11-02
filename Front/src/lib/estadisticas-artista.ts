import type { CitaPanel, DatosPanelArtista } from '../types/panel-artista';
import { contarCanales } from './canales-consulta';
import { fechaLocal, leerFecha } from './panel-artista';

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && Number(mes.slice(0, 4)) > 0;
}

export function moverMes(mes: string, cantidad: number): string {
  const fecha = leerFecha(`${mes}-01`);
  fecha.setMonth(fecha.getMonth() + cantidad);
  return fechaLocal(fecha).slice(0, 7);
}

export function estadisticasMes(datos: DatosPanelArtista, mes: string) {
  if (!mesValido(mes)) throw new Error('Mes inválido.');
  const citas = datos.citas.filter((cita) => cita.fecha.slice(0, 7) === mes);
  const completadas = citas.filter((cita) => cita.estado === 'COMPLETADA');
  const anteriores = new Set(
    datos.citas
      .filter((cita) => cita.estado === 'COMPLETADA' && cita.fecha < `${mes}-01`)
      .map((cita) => cita.clienteId),
  );
  const clientes = new Set(completadas.map((cita) => cita.clienteId));
  const recurrentes = [...clientes].filter((id) => anteriores.has(id)).length;
  const facturacion = completadas.reduce((total, cita) => total + cita.importe, 0);
  const consultas = datos.consultas.filter((consulta) => consulta.fecha.slice(0, 7) === mes);
  const porCliente = [...clientes]
    .map((clienteId) => {
      const sesiones = completadas.filter((cita) => cita.clienteId === clienteId);
      return {
        clienteId,
        sesiones: sesiones.length,
        importe: sesiones.reduce((total, cita) => total + cita.importe, 0),
      };
    })
    .sort(
      (a, b) =>
        b.importe - a.importe || b.sesiones - a.sesiones || a.clienteId.localeCompare(b.clienteId),
    );
  const estados: CitaPanel['estado'][] = ['COMPLETADA', 'CONFIRMADA', 'PENDIENTE', 'CANCELADA'];
  return {
    turnos: citas.length,
    completados: completadas.length,
    cancelados: citas.filter((cita) => cita.estado === 'CANCELADA').length,
    clientes: clientes.size,
    nuevos: clientes.size - recurrentes,
    recurrentes,
    facturacion,
    ticketPromedio: completadas.length ? facturacion / completadas.length : 0,
    horas: completadas.reduce((total, cita) => total + cita.duracion, 0) / 60,
    consultas: consultas.length,
    presupuestadas: consultas.filter((consulta) => Boolean(consulta.presupuesto)).length,
    canales: contarCanales(consultas),
    estados: estados.map((estado) => ({
      estado,
      cantidad: citas.filter((cita) => cita.estado === estado).length,
    })),
    porCliente,
  };
}

export function evolucionFacturacion(datos: DatosPanelArtista, mes: string) {
  return Array.from({ length: 6 }, (_, indice) => {
    const periodo = moverMes(mes, indice - 5);
    return { mes: periodo, importe: estadisticasMes(datos, periodo).facturacion };
  });
}
