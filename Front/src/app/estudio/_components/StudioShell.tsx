'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthProvider';
import { ConsultasProvider } from '@/store/ConsultasProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { PanelShell, type PanelSection } from '@/components/panel/PanelShell';
import { StudioProvider, useStudio } from './StudioProvider';
import styles from '@/components/panel/shell.module.css';

const sections: PanelSection[] = [
  { nombre: 'Resumen', ruta: '/estudio', icono: 'resumen', grupo: 'Trabajo diario' },
  { nombre: 'Agenda', ruta: '/estudio/agenda', icono: 'agenda', grupo: 'Trabajo diario' },
  { nombre: 'Consultas', ruta: '/estudio/consultas', icono: 'consultas', grupo: 'Trabajo diario' },
  { nombre: 'Clientes', ruta: '/estudio/clientes', icono: 'clientes', grupo: 'Trabajo diario' },
  { nombre: 'Mensajes', ruta: '/estudio/mensajes', icono: 'mensajes', grupo: 'Trabajo diario' },
  { nombre: 'Equipo', ruta: '/estudio/equipo', icono: 'clientes', grupo: 'Gestión' },
  {
    nombre: 'Estadísticas',
    ruta: '/estudio/estadisticas',
    icono: 'estadisticas',
    grupo: 'Gestión',
  },
  {
    nombre: 'Recordatorios',
    ruta: '/estudio/recordatorios',
    icono: 'recordatorios',
    grupo: 'Gestión',
  },
  { nombre: 'Suscripción', ruta: '/estudio/suscripcion', icono: 'suscripcion', grupo: 'Gestión' },
  { nombre: 'Perfil del estudio', ruta: '/estudio/perfil', icono: 'estudio', grupo: 'Mi estudio' },
  {
    nombre: 'Configuración',
    ruta: '/estudio/configuracion',
    icono: 'ajustes',
    grupo: 'Mi estudio',
  },
];
export function StudioShell({ children }: { children: ReactNode }) {
  const { usuario, cargando, error, reintentar } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!cargando && !error && usuario?.rol !== 'ESTUDIO_ADMIN')
      router.replace(usuario?.rol === 'ARTISTA' ? '/artista' : '/');
  }, [usuario, cargando, error, router]);
  if (error)
    return (
      <main className={styles.loading}>
        <p role="alert">{error}</p>
        <button className="btn btn-outline-dark" onClick={reintentar}>
          Reintentar
        </button>
      </main>
    );
  if (cargando || usuario?.rol !== 'ESTUDIO_ADMIN')
    return (
      <main className={styles.loading} aria-busy="true">
        <div className={styles.skeleton} />
        <span role="status">Consultando tu sesión…</span>
      </main>
    );
  return (
    <ConsultasProvider key={usuario.id}>
      <StudioProvider key={usuario.id}>
        <Workspace>{children}</Workspace>
      </StudioProvider>
    </ConsultasProvider>
  );
}
function Workspace({ children }: { children: ReactNode }) {
  const { datos, errorPersistencia } = useStudio();
  const consultas = useConsultas();
  const nav = sections.map((s) => ({
    ...s,
    cantidad:
      s.icono === 'consultas'
        ? datos.consultas.filter((c) => c.estado === 'POR_ASIGNAR').length
        : s.icono === 'mensajes'
          ? datos.conversaciones.reduce((n, c) => n + c.sinLeer, 0)
          : 0,
  }));
  return (
    <PanelShell
      secciones={nav}
      nombre={datos.perfil.nombre}
      subtitulo="Cuenta del estudio"
      perfil="/estudio/perfil"
    >
      {errorPersistencia && (
        <p className="alert alert-warning" role="alert">
          {errorPersistencia}
        </p>
      )}
      {consultas.error && !consultas.datos ? (
        <div>
          <p className="alert alert-danger" role="alert">
            {consultas.error}
          </p>
          <button
            className="btn btn-outline-dark"
            onClick={() => {
              void consultas.recargar();
            }}
          >
            Reintentar
          </button>
        </div>
      ) : consultas.cargando && !consultas.datos ? (
        <p role="status">Cargando el estudio…</p>
      ) : (
        children
      )}
    </PanelShell>
  );
}
