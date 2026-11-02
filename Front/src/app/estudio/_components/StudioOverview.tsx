'use client';
import { useConsultas } from '@/hooks/useConsultas';
import { relojEnZona } from '@/lib/agenda';
import Link from 'next/link';
import { useStudio } from './StudioProvider';
import { EmptyState, PageHeader, StatusBadge } from '@/components/panel/PanelUI';
import { cantidad, mostrarFecha } from '@/lib/panel-artista';
import { nombreCanal } from '@/lib/canales-consulta';
import styles from '@/components/panel/workspace.module.css';
import studio from './studio.module.css';

export function StudioOverview() {
  const { datos, buscarCliente, nombreArtista } = useStudio();
  const { datos: fuente } = useConsultas();
  const { fecha: hoy } = relojEnZona(
    fuente?.contexto.zonaHoraria || 'America/Argentina/Buenos_Aires',
  );
  const turnos = datos.citas
    .filter((c) => c.fecha === hoy && c.estado !== 'CANCELADA')
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const pendientes = datos.consultas.filter((c) => c.estado === 'POR_ASIGNAR');
  const abiertas = datos.consultas.filter((c) => c.estado === 'ABIERTA');
  return (
    <>
      <PageHeader
        titulo={datos.perfil.nombre}
        descripcion={mostrarFecha(hoy, { weekday: 'long', day: 'numeric', month: 'long' })}
      >
        <Link href="/estudio/agenda?nueva=1" className={styles.button}>
          Agendar turno
        </Link>
      </PageHeader>
      <div className={styles.stats}>
        {[
          ['Turnos de hoy', turnos.length, '/estudio/agenda'],
          ['Por asignar', pendientes.length, '/estudio/consultas?estado=POR_ASIGNAR'],
          ['Consultas abiertas', abiertas.length, '/estudio/consultas?estado=ABIERTA'],
          [
            'Artistas activos',
            datos.equipo.filter((a) => a.estado === 'ACTIVO').length,
            '/estudio/equipo',
          ],
        ].map(([label, value, href]) => (
          <Link className={styles.stat} href={String(href)} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Ver detalle →</small>
          </Link>
        ))}
      </div>
      {pendientes.length > 0 && (
        <section className={styles.actionSummary}>
          <span className={styles.muted}>Requiere tu atención</span>
          <h2>{cantidad(pendientes.length, 'consulta')} sin artista</h2>
          <p>La recepción de propuestas terminó sin una opción disponible.</p>
          <Link className={styles.button} href="/estudio/consultas?estado=POR_ASIGNAR">
            Asignar consultas
          </Link>
        </section>
      )}
      <div className={studio.grid}>
        <section className={styles.surface}>
          <div className={styles.surfaceHeading}>
            <h2>Agenda de hoy</h2>
            <Link href="/estudio/agenda" className={styles.textButton}>
              Ver agenda
            </Link>
          </div>
          {turnos.length ? (
            turnos.map((c) => (
              <div className={styles.agendaItem} key={c.id}>
                <time>{c.hora}</time>
                <div>
                  <h3>
                    <Link href={`/estudio/agenda?fecha=${c.fecha}&cita=${c.id}`}>{c.titulo}</Link>
                  </h3>
                  <p>
                    {buscarCliente(c.clienteId).nombre} · {nombreArtista(c.artistaId)}
                  </p>
                  <StatusBadge estado={c.estado} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState titulo="No hay turnos hoy" />
          )}
        </section>
        <section className={styles.surface}>
          <div className={styles.surfaceHeading}>
            <h2>Origen de las consultas</h2>
          </div>
          <div className={styles.channelList}>
            {(['INSTAGRAM', 'WHATSAPP', 'TIKTOK', 'FACEBOOK', 'WEB'] as const).map((canal) => {
              const n = datos.consultas.filter((c) => c.canal === canal).length;
              return (
                <div className={styles.channelRow} key={canal}>
                  <div>
                    <div className={styles.channelLabel}>
                      <span>{nombreCanal(canal)}</span>
                      <strong>{n}</strong>
                    </div>
                    <meter
                      min={0}
                      max={Math.max(datos.consultas.length, 1)}
                      value={n}
                      aria-label={`${nombreCanal(canal)}: ${n}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className={styles.surface}>
          <div className={styles.surfaceHeading}>
            <h2>Próximos cierres</h2>
          </div>
          <ul className={studio.list}>
            {abiertas
              .filter((c) => c.cierre)
              .sort((a, b) => a.cierre!.localeCompare(b.cierre!))
              .slice(0, 4)
              .map((c) => (
                <li key={c.id}>
                  <Link href={`/estudio/consultas?consulta=${c.id}`}>
                    <strong>{c.titulo}</strong>
                    <small>
                      {mostrarFecha(c.cierre!)} · {cantidad(c.propuestas.length, 'propuesta')}
                    </small>
                  </Link>
                </li>
              ))}
          </ul>
          {!abiertas.some((c) => c.cierre) && <EmptyState titulo="No hay cierres programados" />}
        </section>
        <section className={styles.surface}>
          <div className={styles.surfaceHeading}>
            <h2>Equipo</h2>
            <Link href="/estudio/equipo" className={styles.textButton}>
              Gestionar
            </Link>
          </div>
          <ul className={studio.list}>
            {datos.equipo
              .filter((a) => a.estado === 'ACTIVO')
              .map((a) => (
                <li key={a.id}>
                  <Link href={`/estudio/equipo?artista=${a.id}`}>
                    <strong>{a.nombre}</strong>
                    <small>{a.estilos}</small>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </>
  );
}
