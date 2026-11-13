'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePanelData } from '@/hooks/usePanelData';
import { PanelIcon } from './PanelUI';
import styles from './shell.module.css';

export function AccesoPanel({
  ruta,
  vinculado = false,
  children,
  mostrarPanel,
}: {
  ruta: '/artista' | '/estudio';
  vinculado?: boolean;
  children: ReactNode;
  mostrarPanel: (contenido: ReactNode, habilitado: boolean) => ReactNode;
}) {
  const pathname = usePathname();
  const { datos, error, recargar } = usePanelData<{ habilitado: boolean }>('/pagos/acceso', 30_000);
  if (pathname === ruta + '/suscripcion') return mostrarPanel(children, datos?.habilitado === true && !error);
  if (datos?.habilitado === true && !error) return mostrarPanel(children, true);

  if (error) return mostrarPanel(
    <div className={styles.avisoPlan}>
      <p role="alert">No pudimos comprobar el acceso a tu panel.</p>
      <button type="button" className="btn btn-outline-dark" onClick={() => void recargar()}>
        Reintentar
      </button>
    </div>, false,
  );
  if (!datos) return mostrarPanel(<p role="status">Comprobando tu suscripción…</p>, false);

  return mostrarPanel(
    <section className={styles.avisoPlan} aria-labelledby="plan-necesario">
      <PanelIcon nombre="suscripcion" size={28} />
      <h1 id="plan-necesario">
        {vinculado ? 'El acceso al panel está pendiente' : 'Suscribite a un plan para acceder a esta funcionalidad'}
      </h1>
      {vinculado ? (
        <p>El titular del estudio puede activar el plan o habilitar tu membresía.</p>
      ) : (
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <Link className="btn btn-dark" href={ruta + '/suscripcion'}>Ver suscripción</Link>
          {ruta === '/artista' && <Link href="/invitacion-equipo">Revisar invitaciones</Link>}
        </div>
      )}
    </section>,
    false,
  );
}
