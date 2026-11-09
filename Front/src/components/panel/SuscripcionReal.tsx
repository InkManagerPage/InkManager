'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import { PageHeader, EmptyState } from './PanelUI';
import { PanelForm, PanelSubmitButton } from './PanelForm';
import styles from './workspace.module.css';

type Suscripcion = {
  plan: string;
  ciclo: string;
  estado: 'PENDIENTE' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | 'ERROR';
  monto: number;
  moneda: string;
  proximoCobroAt: string | null;
  periodoHasta: string | null;
};
const estado = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
  ERROR: 'Error',
};
export function SuscripcionReal({
  plan,
  puedeContratar = true,
}: {
  plan: 'ESTUDIO' | 'INDIVIDUAL';
  puedeContratar?: boolean;
}) {
  const { datos, error, cargando, recargar } = usePanelData<{ suscripcion: Suscripcion | null }>(
    '/pagos/suscripcion',
  );
  const [confirmar, setConfirmar] = useState(false);
  const s = datos?.suscripcion;
  return (
    <>
      <PageHeader titulo="Suscripción">
        {puedeContratar &&
          datos &&
          (!s || ['CANCELADA', 'VENCIDA', 'ERROR'].includes(s.estado)) && (
            <Link className={styles.button} href={'/suscripcion?plan=' + plan}>
              Elegir plan
            </Link>
          )}
      </PageHeader>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}{' '}
          <button className={styles.textButton} onClick={() => void recargar()}>
            Reintentar
          </button>
        </div>
      )}
      {cargando && <p role="status">Consultando tu suscripción…</p>}
      {datos && !s && (
        <EmptyState
          titulo={
            puedeContratar ? 'Todavía no tenés una suscripción' : 'Tu estudio administra el plan'
          }
        />
      )}
      {s && (
        <section className={styles.surface}>
          <div className={styles.surfaceHeading}>
            <h2>{s.plan === 'ESTUDIO' ? 'Plan Estudio' : 'Plan Individual'}</h2>
            <strong>{estado[s.estado]}</strong>
          </div>
          <div className={styles.surfaceBody}>
            <p>
              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: s.moneda }).format(
                s.monto,
              )}{' '}
              · {s.ciclo === 'ANUAL' ? 'Anual' : 'Mensual'}
            </p>
            {s.estado === 'ACTIVA' && s.proximoCobroAt && (
              <p>Próximo cobro el {new Date(s.proximoCobroAt).toLocaleDateString('es-AR')}</p>
            )}
            {s.estado === 'CANCELADA' && s.periodoHasta && (
              <p>Período abonado hasta el {new Date(s.periodoHasta).toLocaleDateString('es-AR')}</p>
            )}
            {['ACTIVA', 'PENDIENTE'].includes(s.estado) && (
              <button className={styles.secondaryButton} onClick={() => setConfirmar(true)}>
                Cancelar renovación
              </button>
            )}
          </div>
        </section>
      )}
      <Modal show={confirmar} onHide={() => setConfirmar(false)} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2">Cancelar renovación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Se cancelará la renovación en Mercado Pago.</p>
          <PanelForm
            initialValues={{}}
            validate={() => ({})}
            onSave={async () => {
              await mutarPanel('/pagos/cancelar-suscripcion', 'POST', {});
              await recargar();
            }}
            onSaved={() => setConfirmar(false)}
          >
            <PanelSubmitButton pendingText="Cancelando…">Confirmar cancelación</PanelSubmitButton>
          </PanelForm>
        </Modal.Body>
      </Modal>
    </>
  );
}
