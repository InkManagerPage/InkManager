'use client';
import { useConsultas } from '@/hooks/useConsultas';
import { relojEnZona } from '@/lib/agenda';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { PageHeader, EmptyState } from '@/components/panel/PanelUI';
import { moneda } from '@/lib/panel-artista';
import { nombreCanal } from '@/lib/canales-consulta';
import { useStudio } from './StudioProvider';
import styles from '@/components/panel/workspace.module.css';
import studio from './studio.module.css';

export function StudioStatistics() {
  const { datos } = useStudio();
  const { params, update } = usePanelFilters();
  const { datos: fuente } = useConsultas();
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('mes') || '')
    ? params.get('mes')!
    : relojEnZona(fuente?.contexto.zonaHoraria || 'America/Argentina/Buenos_Aires').fecha.slice(
        0,
        7,
      );
  const artista = params.get('artista') || '';
  const citas = datos.citas.filter(
    (c) => c.fecha.startsWith(mes) && (!artista || c.artistaId === artista),
  );
  const completadas = citas.filter((c) => c.estado === 'COMPLETADA');
  const total = completadas.reduce((n, c) => n + c.importe, 0);
  const clientes = new Set(completadas.map((c) => c.clienteId)).size;
  const consultas = datos.consultas.filter(
    (c) => c.fecha.startsWith(mes) && (!artista || c.artistaId === artista),
  );
  return (
    <>
      <PageHeader
        titulo="Estadísticas"
        descripcion="Actividad del estudio y resultados por artista."
      />
      <div className={styles.toolbar}>
        <div className={studio.meta}>
          <label>
            Mes
            <input
              type="month"
              value={mes}
              onChange={(e) => update({ mes: e.target.value || null })}
            />
          </label>
          <label>
            Artista
            <select value={artista} onChange={(e) => update({ artista: e.target.value || null })}>
              <option value="">Todo el estudio</option>
              {datos.equipo
                .filter((a) => a.estado !== 'INVITADO')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>
      <div className={styles.stats}>
        {[
          ['Importe de sesiones completadas', moneda(total)],
          ['Clientes atendidos', clientes],
          ['Sesiones completadas', completadas.length],
          ['Horas tatuadas', completadas.reduce((n, c) => n + c.duracion, 0) / 60],
        ].map(([label, value]) => (
          <div className={styles.stat} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {!citas.length && !consultas.length ? (
        <EmptyState titulo="Todavía no hay actividad en este período" />
      ) : (
        <div className={studio.grid}>
          <section className={styles.surface}>
            <div className={styles.surfaceHeading}>
              <h2>Resultados por artista</h2>
            </div>
            <div className={styles.surfaceBody}>
              {datos.equipo
                .filter((a) => a.estado !== 'INVITADO' && (!artista || a.id === artista))
                .map((a) => {
                  const monto = completadas
                    .filter((c) => c.artistaId === a.id)
                    .reduce((n, c) => n + c.importe, 0);
                  return (
                    <div className={studio.bar} key={a.id}>
                      <span>{a.nombre}</span>
                      <meter
                        min={0}
                        max={Math.max(total, 1)}
                        value={monto}
                        aria-label={`${a.nombre}: ${moneda(monto)}`}
                      />
                      <strong>{moneda(monto)}</strong>
                    </div>
                  );
                })}
              <p className={`${studio.formNote} mt-3`}>
                Importes de sesiones marcadas como completadas, sin descontar gastos ni comisiones.
              </p>
            </div>
          </section>
          <section className={styles.surface}>
            <div className={styles.surfaceHeading}>
              <h2>Turnos del período</h2>
            </div>
            <div className={styles.surfaceBody}>
              {Object.entries({
                PENDIENTE: 'Por confirmar',
                CONFIRMADA: 'Confirmados',
                COMPLETADA: 'Completados',
                CANCELADA: 'Cancelados',
              }).map(([key, label]) => (
                <div className={studio.bar} key={key}>
                  <span>{label}</span>
                  <meter
                    min={0}
                    max={Math.max(citas.length, 1)}
                    value={citas.filter((c) => c.estado === key).length}
                    aria-label={label}
                  />
                  <strong>{citas.filter((c) => c.estado === key).length}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.surface}>
            <div className={styles.surfaceHeading}>
              <h2>Origen de las consultas</h2>
            </div>
            <div className={styles.surfaceBody}>
              {(['INSTAGRAM', 'WHATSAPP', 'TIKTOK', 'FACEBOOK', 'WEB'] as const).map((c) => (
                <div className={studio.bar} key={c}>
                  <span>{nombreCanal(c)}</span>
                  <meter
                    min={0}
                    max={Math.max(consultas.length, 1)}
                    value={consultas.filter((x) => x.canal === c).length}
                    aria-label={nombreCanal(c)}
                  />
                  <strong>{consultas.filter((x) => x.canal === c).length}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
