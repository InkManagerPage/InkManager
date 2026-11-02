'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NavigationGuardLink as Link } from 'nextjs-nav-guard';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Dropdown from 'react-bootstrap/Dropdown';
import { useAuth } from '@/store/AuthProvider';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import { Avatar, PanelIcon, type IconoPanel } from './PanelUI';
import styles from './shell.module.css';

export interface PanelSection {
  nombre: string;
  ruta: string;
  icono: IconoPanel;
  grupo: string;
  cantidad?: number;
}
interface Props {
  children: ReactNode;
  secciones: PanelSection[];
  nombre: string;
  subtitulo: string;
  perfil: string;
}

function Navigation({
  secciones,
  nombre,
  subtitulo,
  close,
}: {
  secciones: PanelSection[];
  nombre: string;
  subtitulo: string;
  close?: () => void;
}) {
  const path = usePathname();
  const home = secciones[0]?.ruta || '/estudio';
  return (
    <>
      <Link href={home} className={styles.brand}>
        <span className={styles.brandMark}>im</span>
        <span className={styles.brandName}>InkManager</span>
      </Link>
      <nav aria-label="Panel del estudio" className={styles.navigation}>
        {[...new Set(secciones.map((s) => s.grupo))].map((grupo) => (
          <div className={styles.navGroup} key={grupo}>
            <p className={styles.groupLabel}>{grupo}</p>
            {secciones
              .filter((s) => s.grupo === grupo)
              .map((s) => (
                <Link
                  key={s.ruta}
                  href={s.ruta}
                  title={s.nombre}
                  aria-label={s.nombre}
                  aria-current={path === s.ruta ? 'page' : undefined}
                  className={path === s.ruta ? styles.active : ''}
                  onClick={(event) => {
                    if (path === s.ruta) {
                      event.preventDefault();
                      close?.();
                    }
                  }}
                >
                  <PanelIcon nombre={s.icono} size={19} />
                  <span className={styles.navLabel}>{s.nombre}</span>
                  {Boolean(s.cantidad) && <span className={styles.navCount}>{s.cantidad}</span>}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <PanelIcon nombre="estudio" />
        <div className={styles.footerLabel}>
          <strong>{nombre}</strong>
          <span>{subtitulo}</span>
        </div>
      </div>
      <Link href="/" className={styles.homeLink} title="Volver al inicio">
        <PanelIcon nombre="volver" size={17} />
        <span className={styles.navLabel}>Volver al inicio</span>
      </Link>
    </>
  );
}
function MobileNavigation(props: Pick<Props, 'secciones' | 'nombre' | 'subtitulo'>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={`${styles.iconButton} ${styles.mobileToggle}`}
        aria-controls="studio-mobile-menu"
        aria-expanded={open}
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <PanelIcon nombre="menu" />
      </button>
      <Offcanvas
        show={open}
        onHide={() => setOpen(false)}
        className={styles.mobileMenu}
        id="studio-mobile-menu"
        aria-label="Menú del estudio"
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title className="visually-hidden">Menú del estudio</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Navigation {...props} close={() => setOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
export function PanelShell({ children, secciones, nombre, subtitulo, perfil }: Props) {
  const { usuario, logout } = useAuth();
  const path = usePathname(),
    router = useRouter(),
    confirm = useDiscardChanges();
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem('inkmanager:menu-compacto') === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(''),
    [leaving, setLeaving] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem('inkmanager:menu-compacto', String(compact));
    } catch {
      /* Preferencia opcional. */
    }
  }, [compact]);
  async function salir() {
    setLeaving(true);
    setError('');
    try {
      await logout();
      router.replace('/');
    } catch {
      setError('No pudimos cerrar la sesión. Intentá nuevamente.');
    } finally {
      setLeaving(false);
    }
  }
  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`} data-bs-theme="light">
      <a href="#panel-content" className={styles.skipLink}>
        Ir al contenido
      </a>
      <aside id="panel-sidebar" className={styles.sidebar}>
        <Navigation secciones={secciones} nombre={nombre} subtitulo={subtitulo} />
      </aside>
      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={`${styles.iconButton} ${styles.desktopToggle}`}
              aria-controls="panel-sidebar"
              aria-expanded={!compact}
              aria-label={compact ? 'Expandir menú' : 'Contraer menú'}
              onClick={() => setCompact(!compact)}
            >
              <PanelIcon nombre="menu" />
            </button>
            <MobileNavigation
              key={path}
              secciones={secciones}
              nombre={nombre}
              subtitulo={subtitulo}
            />
            <span>Mi estudio</span>
            <span className={styles.divider}>/</span>
            <strong>{secciones.find((s) => s.ruta === path)?.nombre || 'Consultas'}</strong>
          </div>
          <Dropdown key={path} align="end">
            <Dropdown.Toggle
              as="button"
              className={styles.account}
              aria-label={`Cuenta de ${usuario!.nombre || usuario!.email}`}
            >
              <Avatar nombre={usuario!.nombre || nombre} />
              <span className={styles.accountName}>
                <strong>{usuario!.nombre || nombre}</strong>
                <small>Titular del estudio</small>
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <div className={styles.accountEmail}>{usuario!.email}</div>
              <Dropdown.Item as={NextLink} href={perfil}>
                Perfil del estudio
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                disabled={leaving}
                onClick={() =>
                  confirm(() => {
                    void salir();
                  })
                }
              >
                {leaving ? 'Cerrando…' : 'Cerrar sesión'}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>
        {error && (
          <p className="alert alert-danger m-3" role="alert">
            {error}
          </p>
        )}
        <main id="panel-content" tabIndex={-1} className={styles.workspace}>
          {children}
        </main>
      </div>
    </div>
  );
}
