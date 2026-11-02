'use client';

import { usePanelFilters } from '@/hooks/usePanelFilters';
import Link from 'next/link';
import { useArtistPanel } from './ArtistPanelProvider';
import { EmptyState, PageHeader, PanelIcon } from './PanelUI';
import { mostrarFecha } from '@/lib/panel-artista';
import styles from '@/components/panel/workspace.module.css';

export function ArtistNotifications() {
  const { datos, leerNotificacion } = useArtistPanel();
  const { params, update } = usePanelFilters();
  const soloNuevas = params.get('sinLeer') === '1';
  const setSoloNuevas = (value: boolean) => update({ sinLeer: value ? '1' : null });
  const pendientes = datos.notificaciones.filter((item) => !item.leida).length;
  const visibles = datos.notificaciones
    .filter((item) => !soloNuevas || !item.leida)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
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
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            aria-pressed={!soloNuevas}
            className={!soloNuevas ? styles.tabActive : ''}
            onClick={() => setSoloNuevas(false)}
          >
            Todas<span>{datos.notificaciones.length}</span>
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
        {visibles.length ? (
          visibles.map((item) => (
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
                    <button className={styles.textButton} onClick={() => leerNotificacion(item.id)}>
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
        ) : (
          <EmptyState titulo="Estás al día" detalle="No tenés notificaciones pendientes." />
        )}
      </section>
    </>
  );
}
