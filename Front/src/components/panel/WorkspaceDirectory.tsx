'use client';
import Link from 'next/link';
import { useAuth } from '@/store/AuthProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { PageHeader, EmptyState, Avatar } from './PanelUI';
import { TeamWorkspace } from './TeamWorkspace';
import styles from './workspace.module.css';
export function WorkspaceDirectory({ tipo }: { tipo: 'CLIENTES' | 'EQUIPO' }) {
  return tipo === 'EQUIPO' ? <TeamWorkspace /> : <ClientsDirectory />;
}
function ClientsDirectory() {
  const { datos, error, cargando, recargar } = useConsultas();
  const { usuario } = useAuth();
  const base = usuario?.rol === 'ESTUDIO_ADMIN' ? '/estudio' : '/artista';
  return (
    <>
      <PageHeader titulo="Clientes" />
      {error && (
        <p className={styles.notice} role="alert">
          {error}
          <button
            className={styles.textButton}
            onClick={() => {
              void recargar();
            }}
          >
            Reintentar
          </button>
        </p>
      )}
      {cargando && !datos ? (
        <p role="status">Cargando…</p>
      ) : (
        <section className={styles.surface}>
          {datos?.clientes.length ? (
            datos.clientes.map((c) => (
              <article className={styles.mobileItem} key={c.id}>
                <div className={styles.identity}>
                  <Avatar nombre={c.nombre} />
                  <div>
                    <strong>{c.nombre}</strong>
                    <small>{c.ciudad}</small>
                  </div>
                </div>
                <p>{c.email}</p>
                <p>{c.telefono}</p>
                <Link href={base + '/consultas?cliente=' + c.id} className={styles.textButton}>
                  Ver consultas y propuestas
                </Link>
                <p>
                  <Link
                    href={
                      base + '/agenda?cliente=' + c.id + '&rango=todos&vista=LISTA&canceladas=1'
                    }
                    className={styles.textButton}
                  >
                    Ver turnos ({datos.citas.filter((t) => t.clienteId === c.id).length})
                  </Link>
                </p>
              </article>
            ))
          ) : (
            <EmptyState titulo="Todavía no hay clientes" />
          )}
        </section>
      )}
    </>
  );
}
