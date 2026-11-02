'use client';
import { useConsultas } from '@/hooks/useConsultas';
import { relojEnZona } from '@/lib/agenda';

import { usePanelFilters } from '@/hooks/usePanelFilters';
import Link from 'next/link';
import { useArtistPanel } from './ArtistPanelProvider';
import { Avatar, EmptyState, PageHeader, PanelIcon, StatusBadge } from './PanelUI';
import {
  estadisticasMes,
  evolucionFacturacion,
  mesValido,
  moverMes,
} from '@/lib/estadisticas-artista';
import { cantidad, moneda, mostrarFecha } from '@/lib/panel-artista';
import styles from '@/components/panel/workspace.module.css';
import charts from './statistics.module.css';

const numero = (valor: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(valor);
const porcentaje = (parte: number, total: number) =>
  total ? `${numero((parte / total) * 100)} %` : '—';

export function ArtistStatistics() {
  const { datos, buscarCliente } = useArtistPanel();
  const { datos: fuente } = useConsultas();
  const mesActual = relojEnZona(
    fuente?.contexto.zonaHoraria || 'America/Argentina/Buenos_Aires',
  ).fecha.slice(0, 7);
  const { params, update } = usePanelFilters();
  const mesParam = params.get('mes') || '';
  const mes = mesValido(mesParam) && mesParam <= mesActual ? mesParam : mesActual;
  const setMes = (value: string) => update({ mes: value });
  const enEstudio = fuente?.contexto.tipo === 'ESTUDIO';
  const consultasPropias = new Set(
    fuente?.consultas
      .filter(
        (c) =>
          c.artistaId === fuente.contexto.usuarioId ||
          c.propuestas.some((p) => p.artistaId === fuente.contexto.usuarioId),
      )
      .map((c) => c.id),
  );
  const personales = enEstudio
    ? { ...datos, consultas: datos.consultas.filter((c) => consultasPropias.has(c.id)) }
    : datos;
  const resumen = estadisticasMes(personales, mes);
  const anterior = estadisticasMes(personales, moverMes(mes, -1));
  const evolucion = evolucionFacturacion(personales, mes);
  const maximo = Math.max(...evolucion.map((item) => item.importe), 1);
  const cambio = anterior.facturacion
    ? ((resumen.facturacion - anterior.facturacion) / anterior.facturacion) * 100
    : null;
  const tituloMes = mostrarFecha(`${mes}-01`, { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        titulo="Estadísticas"
        descripcion="Tus sesiones, clientes e importes realizados · ARS"
      >
        <div className={charts.period}>
          <button
            type="button"
            className={styles.secondaryButton}
            aria-label="Mes anterior"
            onClick={() => setMes(moverMes(mes, -1))}
            disabled={mes <= '1900-01'}
          >
            <PanelIcon nombre="volver" size={16} />
          </button>
          <label className={charts.month}>
            <span className="visually-hidden">Mes de las estadísticas</span>
            <input
              type="month"
              min="1900-01"
              max={mesActual}
              value={mes}
              onChange={(event) => {
                if (mesValido(event.target.value) && event.target.value <= mesActual)
                  setMes(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className={styles.secondaryButton}
            aria-label="Mes siguiente"
            disabled={mes >= mesActual}
            onClick={() => setMes(moverMes(mes, 1))}
          >
            <PanelIcon nombre="flecha" size={16} />
          </button>
        </div>
      </PageHeader>
      <div className={charts.periodHeading}>
        <h2>{tituloMes}</h2>
        {mes !== mesActual && (
          <button className={styles.textButton} onClick={() => setMes(mesActual)}>
            Volver a este mes
          </button>
        )}
        {mes === mesActual && <span>En curso</span>}
      </div>
      <div className={styles.stats} aria-label="Indicadores del mes">
        <div className={styles.stat}>
          <span>Importe de sesiones realizadas</span>
          <strong>{moneda(resumen.facturacion)}</strong>
          <small>Sesiones completadas</small>
        </div>
        <div className={styles.stat}>
          <span>Clientes atendidos</span>
          <strong>{resumen.clientes}</strong>
          <small>
            {cantidad(resumen.nuevos, 'nuevo')} · {cantidad(resumen.recurrentes, 'recurrente')}
          </small>
        </div>
        <div className={styles.stat}>
          <span>Turnos del mes</span>
          <strong>{resumen.turnos}</strong>
          <small>
            {cantidad(resumen.completados, 'completado')} ·{' '}
            {cantidad(resumen.cancelados, 'cancelado')}
          </small>
        </div>
        <div className={styles.stat}>
          <span>{enEstudio ? 'Consultas atendidas' : 'Consultas recibidas'}</span>
          <strong>{resumen.consultas}</strong>
          <small>{cantidad(resumen.presupuestadas, 'consulta')} con presupuesto</small>
        </div>
      </div>
      <div className={charts.columns}>
        <section className={styles.surface} aria-labelledby="revenue-title">
          <div className={styles.surfaceHeading}>
            <h2 id="revenue-title">Evolución de importes realizados</h2>
            <small>Últimos 6 meses</small>
          </div>
          <div className={charts.revenue}>
            {evolucion.map((item) => (
              <div
                className={`${charts.revenueRow} ${item.mes === mes ? charts.selected : ''}`}
                key={item.mes}
              >
                <span>{mostrarFecha(`${item.mes}-01`, { month: 'short', year: '2-digit' })}</span>
                <meter
                  min={0}
                  max={maximo}
                  value={item.importe}
                  aria-label={`${mostrarFecha(`${item.mes}-01`, { month: 'long', year: 'numeric' })}: ${moneda(item.importe)}`}
                />
                <strong>{moneda(item.importe)}</strong>
              </div>
            ))}
          </div>
          <div className={styles.sectionFoot}>
            <span>
              {mes === mesActual ? 'Mes anterior completo' : 'Mes anterior'}:{' '}
              {moneda(anterior.facturacion)}
            </span>
            <strong>
              {mes === mesActual
                ? 'Mes en curso'
                : cambio === null
                  ? 'Sin base de comparación'
                  : `${cambio > 0 ? '+' : ''}${numero(cambio)} %`}
            </strong>
          </div>
        </section>
        <section className={styles.surface} aria-labelledby="query-sources">
          <div className={styles.surfaceHeading}>
            <h2 id="query-sources">Origen de las consultas</h2>
          </div>
          <div className={styles.channelList}>
            {resumen.canales.map((canal) => (
              <div className={styles.channelRow} key={canal.id}>
                <span className={styles.channelMark} aria-hidden="true">
                  {canal.abreviatura}
                </span>
                <div>
                  <div className={styles.channelLabel}>
                    <span>{canal.nombre}</span>
                    <strong>{canal.cantidad}</strong>
                  </div>
                  <meter
                    min={0}
                    max={Math.max(resumen.consultas, 1)}
                    value={canal.cantidad}
                    aria-label={`${canal.nombre}: ${cantidad(canal.cantidad, 'consulta')}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.sectionFoot}>
            <span>Canal de recepción del mensaje</span>
            <span>{cantidad(resumen.consultas, 'consulta')}</span>
          </div>
        </section>
      </div>
      <dl className={charts.details}>
        <div>
          <dt>Importe promedio por sesión</dt>
          <dd>{moneda(resumen.ticketPromedio)}</dd>
        </div>
        <div>
          <dt>Horas de sesiones completadas</dt>
          <dd>{numero(resumen.horas)} h</dd>
        </div>
        <div>
          <dt>Clientes recurrentes</dt>
          <dd>{porcentaje(resumen.recurrentes, resumen.clientes)}</dd>
        </div>
        <div>
          <dt>Turnos cancelados</dt>
          <dd>{porcentaje(resumen.cancelados, resumen.turnos)}</dd>
        </div>
      </dl>
      <div className={charts.columns}>
        <section className={styles.surface} aria-labelledby="client-stats">
          <div className={styles.surfaceHeading}>
            <h2 id="client-stats">Clientes atendidos</h2>
            <small>Por importe de sesiones</small>
          </div>
          {resumen.porCliente.length ? (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Sesiones</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porCliente.slice(0, 5).map((cliente) => (
                    <tr key={cliente.clienteId}>
                      <td>
                        <Link
                          href={`/artista/clientes?cliente=${cliente.clienteId}`}
                          className={`${styles.identity} ${styles.rowLink}`}
                        >
                          <Avatar nombre={buscarCliente(cliente.clienteId).nombre} />
                          <strong>{buscarCliente(cliente.clienteId).nombre}</strong>
                        </Link>
                      </td>
                      <td>{cliente.sesiones}</td>
                      <td>{moneda(cliente.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              titulo="Sin sesiones completadas"
              detalle="Los clientes atendidos aparecerán cuando completes sus turnos."
            />
          )}
        </section>
        <section className={styles.surface} aria-labelledby="appointment-stats">
          <div className={styles.surfaceHeading}>
            <h2 id="appointment-stats">Estado de los turnos</h2>
            <small>{resumen.turnos} en total</small>
          </div>
          <div className={charts.appointments}>
            {resumen.estados.map((item) => (
              <div key={item.estado}>
                <StatusBadge estado={item.estado} />
                <strong>{item.cantidad}</strong>
                <span>{porcentaje(item.cantidad, resumen.turnos)}</span>
              </div>
            ))}
          </div>
          <div className={styles.sectionFoot}>
            <Link
              className={styles.textButton}
              href={`/artista/agenda?fecha=${mes}-01&rango=mes&vista=LISTA&canceladas=1`}
            >
              Ver turnos del mes <PanelIcon nombre="flecha" size={15} />
            </Link>
          </div>
        </section>
      </div>
      <p className={charts.note}>
        El importe realizado suma las sesiones completadas. No representa cobros confirmados ni
        incluye presupuestos. No suma las señas por separado. Los clientes recurrentes tienen una
        sesión completada en un mes anterior.
      </p>
    </>
  );
}
