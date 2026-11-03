'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NavigationGuardLink as Link } from 'nextjs-nav-guard';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Dropdown from 'react-bootstrap/Dropdown';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useAuth } from '@/store/AuthProvider';
import { ConsultasProvider } from '@/store/ConsultasProvider';
import { camposPendientes } from '@/lib/perfil-artista';
import { ArtistProfileProvider, useArtistProfile } from './ArtistProfileProvider';
import { ArtistPanelProvider, useArtistPanel } from './ArtistPanelProvider';
import { Avatar, PanelIcon, type IconoPanel } from './PanelUI';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import styles from '@/components/panel/shell.module.css';

const navegacion: { nombre: string; ruta: string; icono: IconoPanel; grupo: string }[] = [
  { nombre: 'Resumen', ruta: '/artista', icono: 'resumen', grupo: 'Trabajo diario' },
  { nombre: 'Agenda', ruta: '/artista/agenda', icono: 'agenda', grupo: 'Trabajo diario' },
  {
    nombre: 'Disponibilidad',
    ruta: '/artista/disponibilidad',
    icono: 'reloj',
    grupo: 'Trabajo diario',
  },
  { nombre: 'Consultas', ruta: '/artista/consultas', icono: 'consultas', grupo: 'Trabajo diario' },
  { nombre: 'Clientes', ruta: '/artista/clientes', icono: 'clientes', grupo: 'Trabajo diario' },
  { nombre: 'Mensajes', ruta: '/artista/mensajes', icono: 'mensajes', grupo: 'Trabajo diario' },
  {
    nombre: 'Estadísticas',
    ruta: '/artista/estadisticas',
    icono: 'estadisticas',
    grupo: 'Gestión',
  },
  {
    nombre: 'Recordatorios',
    ruta: '/artista/recordatorios',
    icono: 'recordatorios',
    grupo: 'Gestión',
  },
  { nombre: 'Suscripción', ruta: '/artista/suscripcion', icono: 'suscripcion', grupo: 'Gestión' },
  {
    nombre: 'Mis trabajos',
    ruta: '/artista/trabajos',
    icono: 'trabajos',
    grupo: 'Perfil y cuenta',
  },
  { nombre: 'Mi perfil', ruta: '/artista/perfil', icono: 'perfil', grupo: 'Perfil y cuenta' },
  { nombre: 'Mi estudio', ruta: '/artista/estudio', icono: 'estudio', grupo: 'Perfil y cuenta' },
  {
    nombre: 'Configuración',
    ruta: '/artista/configuracion',
    icono: 'ajustes',
    grupo: 'Perfil y cuenta',
  },
];

export function ArtistShell({ children }: { children: ReactNode }) {
  const { usuario, cargando, error, reintentar } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!cargando && !error && usuario?.rol !== 'ARTISTA') router.replace('/');
  }, [cargando, error, usuario, router]);
  if (error)
    return (
      <main className={styles.loading}>
        <p role="alert">{error}</p>
        <button className="btn btn-outline-dark" onClick={reintentar}>
          Reintentar
        </button>
      </main>
    );
  if (cargando || usuario?.rol !== 'ARTISTA')
    return (
      <main className={styles.loading} aria-busy="true">
        <div className={styles.skeleton} />
        <span role="status">{cargando ? 'Consultando tu sesión…' : 'Volviendo al inicio…'}</span>
      </main>
    );
  return (
    <ConsultasProvider key={usuario.id}>
      <ArtistProfileProvider key={usuario.id}>
        <ArtistPanelProvider>
          <ArtistPanel>{children}</ArtistPanel>
        </ArtistPanelProvider>
      </ArtistProfileProvider>
    </ConsultasProvider>
  );
}

function ArtistNavigation({ cerrar }: { cerrar?: () => void }) {
  const pathname = usePathname();
  const { datos } = useArtistPanel();
  const { perfil } = useArtistProfile();
  const pendientes = perfil ? camposPendientes(perfil) : [];
  const nuevas = datos.consultas.filter((item) => item.estado === 'NUEVA').length;
  const mensajes = datos.conversaciones.reduce((total, item) => total + item.sinLeer, 0);
  return (
    <>
      <Link
        href="/artista"
        className={styles.brand}
        onClick={(event) => {
          if (pathname === '/artista') {
            event.preventDefault();
            cerrar?.();
          }
        }}
      >
        <span className={styles.brandMark}>im</span>
        <span className={styles.brandName}>InkManager</span>
      </Link>
      <nav aria-label="Panel del artista" className={styles.navigation}>
        {['Trabajo diario', 'Gestión', 'Perfil y cuenta'].map((grupo) => (
          <div className={styles.navGroup} key={grupo}>
            <p className={styles.groupLabel}>{grupo}</p>
            {navegacion
              .filter((item) => item.grupo === grupo)
              .map((item) => {
                const activa = pathname === item.ruta;
                const cantidad =
                  item.icono === 'consultas' ? nuevas : item.icono === 'mensajes' ? mensajes : 0;
                return (
                  <Link
                    key={item.ruta}
                    href={item.ruta}
                    title={item.nombre}
                    aria-label={item.nombre}
                    aria-current={activa ? 'page' : undefined}
                    className={activa ? styles.active : ''}
                    onClick={(event) => {
                      if (pathname === item.ruta) {
                        event.preventDefault();
                        cerrar?.();
                      }
                    }}
                  >
                    <PanelIcon nombre={item.icono} size={19} />
                    <span className={styles.navLabel}>{item.nombre}</span>
                    {cantidad > 0 && <span className={styles.navCount}>{cantidad}</span>}
                    {item.icono === 'perfil' && pendientes.length > 0 && (
                      <OverlayTrigger
                        placement="right"
                        trigger={['hover', 'focus']}
                        overlay={
                          <Tooltip id="profile-pending">
                            Falta completar: {pendientes.join(', ')}.
                          </Tooltip>
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
                );
              })}
          </div>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <PanelIcon nombre="estudio" />
        <div className={styles.footerLabel}>
          <strong>{datos.estudio?.nombre || 'Independiente'}</strong>
          <span>{datos.estudio ? 'Integrante del equipo' : 'Mi espacio de trabajo'}</span>
        </div>
      </div>
      <Link href="/" className={styles.homeLink} title="Volver al inicio">
        <PanelIcon nombre="volver" size={17} />
        <span className={styles.navLabel}>Volver al inicio</span>
      </Link>
    </>
  );
}

function ArtistMobileNavigation() {
  const [menuMovil, setMenuMovil] = useState(false);
  return (
    <>
      {' '}
      <button
        type="button"
        className={`${styles.iconButton} ${styles.mobileToggle}`}
        aria-controls="artist-mobile-menu"
        aria-expanded={menuMovil}
        aria-label="Abrir menú"
        onClick={() => setMenuMovil(true)}
      >
        <PanelIcon nombre="menu" />
      </button>
      <Offcanvas
        show={menuMovil}
        onHide={() => setMenuMovil(false)}
        className={styles.mobileMenu}
        id="artist-mobile-menu"
        aria-label="Menú del artista"
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title className="visually-hidden">Menú del artista</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ArtistNavigation cerrar={() => setMenuMovil(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

function ArtistPanel({ children }: { children: ReactNode }) {
  const confirmClose = useDiscardChanges();
  const { usuario, logout } = useAuth();
  const { perfil } = useArtistProfile();
  const { datos } = useArtistPanel();
  const pathname = usePathname();
  const router = useRouter();
  const [compacto, setCompacto] = useState(() => {
    try {
      return localStorage.getItem('inkmanager:menu-compacto') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('inkmanager:menu-compacto', String(compacto));
    } catch {
      /* Preferencia opcional. */
    }
  }, [compacto]);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');
  const titulo = navegacion.find((item) => item.ruta === pathname)?.nombre || 'Notificaciones';
  const nombre = perfil?.nombreArtistico || usuario!.nombre || 'Mi cuenta';
  const noLeidas = datos.notificaciones.filter((item) => !item.leida).length;
  async function salir() {
    setSaliendo(true);
    setErrorSalida('');
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
    <div className={`${styles.panel} ${compacto ? styles.compact : ''}`} data-bs-theme="light">
      <a className={styles.skipLink} href="#artist-content">
        Ir al contenido
      </a>
      <aside id="artist-sidebar" className={styles.sidebar}>
        <ArtistNavigation />
      </aside>

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.desktopToggle}`}
              aria-controls="artist-sidebar"
              aria-expanded={!compacto}
              aria-label={compacto ? 'Expandir menú' : 'Contraer menú'}
              onClick={() => setCompacto(!compacto)}
            >
              <PanelIcon nombre="menu" />
            </button>
            <ArtistMobileNavigation key={pathname} />
            <span>Mi panel</span>
            <span className={styles.divider}>/</span>
            <strong>{titulo}</strong>
          </div>
          <div className={styles.topbarActions}>
            <Link
              className={styles.notificationButton}
              href="/artista/notificaciones"
              aria-label={`Notificaciones, ${noLeidas} sin leer`}
            >
              <PanelIcon nombre="campana" />
              {noLeidas > 0 && <i />}
            </Link>
            <Dropdown key={pathname} align="end">
              <Dropdown.Toggle
                as="button"
                className={styles.account}
                aria-label={`Cuenta de ${nombre}`}
              >
                <Avatar nombre={nombre} />
                <span className={styles.accountName}>
                  <strong>{nombre}</strong>
                  <small>Artista</small>
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <div className={styles.accountEmail}>{usuario!.email}</div>
                <Dropdown.Item as={NextLink} href="/artista/perfil">
                  Mi perfil
                </Dropdown.Item>
                <Dropdown.Item as={Link} href="/artista/configuracion">
                  Configuración
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  as="button"
                  onClick={() =>
                    confirmClose(() => {
                      void salir();
                    })
                  }
                  disabled={saliendo}
                >
                  {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>
        {errorSalida && (
          <div className="alert alert-danger m-3" role="alert">
            {errorSalida}
          </div>
        )}
        <main id="artist-content" tabIndex={-1} className={styles.workspace}>
          {children}
        </main>
      </div>
    </div>
  );
}
