'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthProvider';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { camposPendientes } from '@/lib/perfil-artista';
import { ArtistProfileProvider, useArtistProfile } from './ArtistProfileProvider';
import styles from './panel.module.css';

export function ArtistShell({ children }: { children: ReactNode }) {
  const { usuario, cargando, error, reintentar } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!cargando && !error && usuario?.rol !== 'ARTISTA') router.replace('/');
  }, [cargando, error, usuario, router]);
  if (cargando)
    return (
      <main className={styles.loading} role="status">
        Consultando tu sesión…
      </main>
    );
  if (error)
    return (
      <main className={styles.loading}>
        <p role="alert">{error}</p>
        <button className="btn btn-outline-dark" onClick={reintentar}>
          Reintentar
        </button>
      </main>
    );
  if (usuario?.rol !== 'ARTISTA')
    return (
      <main className={styles.loading} role="status">
        Volviendo al inicio…
      </main>
    );
  return (
    <ArtistProfileProvider>
      <ArtistPanel>{children}</ArtistPanel>
    </ArtistProfileProvider>
  );
}

function ArtistPanel({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const { perfil } = useArtistProfile();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');
  const pendientes = perfil ? camposPendientes(perfil) : [];
  async function salir() {
    setSaliendo(true);
    try {
      await logout();
      router.replace('/');
    } catch {
      setErrorSalida('No pudimos cerrar la sesión. Intentá nuevamente.');
    } finally {
      setSaliendo(false);
    }
  }
  return (
    <div className={`${styles.panel} ${!menuAbierto ? styles.collapsed : ''}`}>
      <aside id="artist-sidebar" className={styles.sidebar} hidden={!menuAbierto}>
        <Link href="/" className={styles.brand}>
          InkManager
        </Link>
        <nav aria-label="Panel del artista" className={styles.navigation}>
          <Link
            href="/artista/trabajos"
            className={pathname === '/artista/trabajos' ? styles.active : ''}
            aria-current={pathname === '/artista/trabajos' ? 'page' : undefined}
          >
            Mis trabajos
          </Link>
          <Link
            href="/artista/perfil"
            className={pathname === '/artista/perfil' ? styles.active : ''}
            aria-current={pathname === '/artista/perfil' ? 'page' : undefined}
          >
            Mi perfil
            {pendientes.length > 0 && (
              <OverlayTrigger
                placement="right"
                trigger={['hover', 'focus']}
                overlay={
                  <Tooltip id="profile-pending">Falta completar: {pendientes.join(', ')}.</Tooltip>
                }
              >
                <span
                  className={styles.pendingDot}
                  tabIndex={0}
                  role="img"
                  aria-label="Faltan completar datos del perfil"
                />
              </OverlayTrigger>
            )}
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" onClick={salir} disabled={saliendo}>
            {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
          {errorSalida && <small role="alert">{errorSalida}</small>}
        </div>
      </aside>
      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-controls="artist-sidebar"
            aria-expanded={menuAbierto}
            aria-label={menuAbierto ? 'Ocultar menú' : 'Mostrar menú'}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className={styles.account}>
            <span>{usuario?.nombre || perfil?.nombreArtistico}</span>
            <small>{usuario?.email}</small>
          </div>
        </header>
        <main className={styles.workspace}>{children}</main>
      </div>
    </div>
  );
}
