'use client';

import { usePanelFilters } from '@/hooks/usePanelFilters';
import Link from 'next/link';
import type { NotificacionPanel } from '@/types/panel-artista';
import { EmptyState, PageHeader, PanelIcon } from './PanelUI';
import { mostrarFecha } from '@/lib/panel-artista';
import styles from '@/components/panel/workspace.module.css';

export function NotificacionesPanel({
  avisos,
  leerNotificacion,
  cargandoOperacion,
  errorOperacion,
}: {
  avisos: NotificacionPanel[];
  leerNotificacion: (id?: string) => Promise<void>;
  cargandoOperacion: boolean;
  errorOperacion: string;
}) {
  const { params, update } = usePanelFilters();
  const soloNuevas = params.get('sinLeer') === '1';
  const setSoloNuevas = (value: boolean) => update({ sinLeer: value ? '1' : null });
  const pendientes = avisos.filter((item) => !item.leida).length;
  const visibles = avisos
    .filter((item) => !soloNuevas || !item.leida)
    .sort((a, b) => Number(Boolean(b.urgente && !b.leida)) - Number(Boolean(a.urgente && !a.leida)) || b.fecha.localeCompare(a.fecha));
  return (
    <>
      <PageHeader
        titulo="Notificaciones"
        descripcion="Novedades de tus consultas, sesiones y equipo."
      >
        <button
          className={styles.secondaryButton}
          onClick={() => leerNotificacion()}
          disabled={!pendientes}
        >
          <PanelIcon nombre="check" size={17} />
          Marcar todas como leídas
        </button>
      </PageHeader>
      {errorOperacion && (
        <p className="alert alert-danger" role="alert">
          {errorOperacion}
        </p>
      )}
      {cargandoOperacion && <p role="status">Cargando notificaciones…</p>}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            aria-pressed={!soloNuevas}
            className={!soloNuevas ? styles.tabActive : ''}
            onClick={() => setSoloNuevas(false)}
          >
            Todas<span>{avisos.length}</span>
          </button>
          <button
            aria-pressed={soloNuevas}
            className={soloNuevas ? styles.tabActive : ''}
            onClick={() => setSoloNuevas(true)}
          >
            Sin leer<span>{pendientes}</span>
          </button>
        </div>
      </div>
      <section className={styles.surface} aria-label="Notificaciones">
        {visibles.length
          ? visibles.map((item) => (
              <article
                className={`${styles.notification} ${!item.leida ? styles.unread : ''}`}
                key={item.id}
              >
                <span className={styles.avatar}>
                  <PanelIcon nombre="campana" size={18} />
                </span>
                <div>
                  <h2>
                    {item.titulo}
                    {item.urgente && <span className="badge text-bg-danger ms-2">Urgente</span>}
                    {!item.leida && <span className={styles.unreadMark} aria-label="Sin leer" />}
                  </h2>
                  <p>{item.detalle}</p>
                  <div className={styles.headerActions}>
                    <Link
                      href={item.destino}
                      onClick={() => leerNotificacion(item.id)}
                      className={styles.textButton}
                    >
                      Ver detalle
                      <PanelIcon nombre="flecha" size={15} />
                    </Link>
                    {!item.leida && (
                      <button
                        className={styles.textButton}
                        onClick={() => leerNotificacion(item.id)}
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
                <time dateTime={item.fecha}>
                  {mostrarFecha(item.fecha, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </article>
            ))
          : !cargandoOperacion && (
              <EmptyState titulo="Estás al día" detalle="No tenés notificaciones pendientes." />
            )}
      </section>
    </>
  );
}
