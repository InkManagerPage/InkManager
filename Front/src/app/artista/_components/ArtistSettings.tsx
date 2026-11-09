'use client';
import Link from 'next/link';
import { useAuth } from '@/store/AuthProvider';
import { CuentasAsociadas } from '@/components/panel/CuentasAsociadas';
import { PageHeader, PanelIcon } from './PanelUI';
import styles from '@/components/panel/workspace.module.css';
export function ArtistSettings() {
  const { usuario } = useAuth();
  return (
    <>
      <PageHeader titulo="Configuración" />
      {usuario && !usuario.estudioId && <CuentasAsociadas />}
      <section className={styles.settingsSection}>
        <div>
          <h2>Disponibilidad</h2>
          <p>Horarios de atención y fechas sin reservas.</p>
        </div>
        <div>
          <Link href="/artista/disponibilidad" className={styles.textButton}>
            Administrar horarios y bloqueos <PanelIcon nombre="flecha" size={15} />
          </Link>
        </div>
      </section>
      <section className={styles.settingsSection}>
        <div>
          <h2>Tu cuenta</h2>
          <p>Datos de acceso a InkManager.</p>
        </div>
        <div>
          <p className={styles.description}>{usuario?.email}</p>
          <Link href="/recuperar-contrasena" className={styles.textButton}>
            Crear o restablecer contraseña <PanelIcon nombre="flecha" size={15} />
          </Link>
        </div>
      </section>
      <section className={styles.settingsSection}>
        <div>
          <h2>Correos automáticos</h2>
          <p>Turnos, cuidados, reseñas y resúmenes de tu actividad.</p>
        </div>
        <div>
          <Link href="/artista/recordatorios" className={styles.textButton}>
            Administrar recordatorios <PanelIcon nombre="flecha" size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
