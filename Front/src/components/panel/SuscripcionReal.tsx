'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import { PageHeader, EmptyState } from './PanelUI';
import { PanelForm, PanelSubmitButton } from './PanelForm';
import styles from './workspace.module.css';

type Suscripcion = {
  id: string;
  plan: string;
  ciclo: string;
  estado: 'PENDIENTE' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | 'PAUSADA' | 'RECHAZADA' | 'ERROR';
  bonificada: boolean;
  renovacion: boolean;
  monto: number;
  moneda: string;
  proximoCobroAt: string | null;
  periodoHasta: string | null;
  periodoAbonadoVigente: boolean;
};
const estado = {
  PENDIENTE: 'Pendiente',
  ACTIVA: 'Activa',
  VENCIDA: 'Vencida',
  CANCELADA: 'Cancelada',
  PAUSADA: 'Pausada',
  RECHAZADA: 'Rechazada',
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
  const [confirmarInmediata, setConfirmarInmediata] = useState(false);
  const s = datos?.suscripcion;
  const puedeElegirPlan =
    !s ||
    (['CANCELADA', 'VENCIDA', 'RECHAZADA', 'ERROR'].includes(s.estado) && !s.periodoAbonadoVigente);
  return (
    <>
      <PageHeader titulo="Suscripción">
        {puedeContratar && datos && puedeElegirPlan && (
          <Link className={styles.button} href={`/checkout?plan=${plan}&cycle=MENSUAL`}>
            Suscribirme ahora
          </Link>
        )}
        {puedeContratar && s?.estado === 'PENDIENTE' && (
          <>
            {s.id && (
              <Link className={styles.secondaryButton} href={`/checkout/pending/${s.id}`}>
                Verificar pago
              </Link>
            )}
            <Link className={styles.button} href={`/checkout?plan=${s.plan}&cycle=${s.ciclo}`}>
              Continuar pago
            </Link>
          </>
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
            {s.bonificada ? (
              <p>
                Plan bonificado{' '}
                {s.periodoHasta
                  ? 'hasta el ' + new Date(s.periodoHasta).toLocaleDateString('es-AR')
                  : 'sin vencimiento'}
              </p>
            ) : (
              <p>
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: s.moneda }).format(
                  s.monto,
                )}
                {' · '}
                {s.ciclo === 'ANUAL' ? 'Anual' : 'Mensual'}
              </p>
            )}
            {s.renovacion && s.estado === 'ACTIVA' && s.proximoCobroAt && (
              <p>Próximo cobro el {new Date(s.proximoCobroAt).toLocaleDateString('es-AR')}</p>
            )}
            {!s.bonificada && (!s.renovacion || s.estado === 'PAUSADA') && s.periodoHasta && (
              <p>Período abonado hasta el {new Date(s.periodoHasta).toLocaleDateString('es-AR')}</p>
            )}
            {puedeContratar &&
              !s.bonificada &&
              ['ACTIVA', 'PENDIENTE', 'PAUSADA'].includes(s.estado) && (
                <div className="d-flex flex-wrap gap-2">
                  {(s.renovacion || s.estado === 'PENDIENTE') && (
                    <button className={styles.secondaryButton} onClick={() => setConfirmar(true)}>
                      {s.estado === 'PENDIENTE' ? 'Cancelar intento' : 'Cancelar renovación'}
                    </button>
                  )}
                  {s.estado !== 'PENDIENTE' && (
                    <button
                      className={styles.secondaryButton}
                      onClick={() => setConfirmarInmediata(true)}
                    >
                      Cancelar suscripción ahora
                    </button>
                  )}
                </div>
              )}
          </div>
        </section>
      )}
      <Modal show={confirmar} onHide={() => setConfirmar(false)} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2">
            {s?.estado === 'PENDIENTE' ? 'Cancelar intento' : 'Cancelar renovación'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {s?.estado === 'PENDIENTE'
              ? 'Se cerrará el intento de pago en Mercado Pago.'
              : 'Se cancelará la renovación en Mercado Pago.'}
          </p>
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
      <Modal show={confirmarInmediata} onHide={() => setConfirmarInmediata(false)} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2">Cancelar suscripción ahora</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Se cancelará el plan y se desactivará el acceso inmediatamente. Esta acción no reembolsa
            pagos anteriores. Después podrás volver a suscribirte con esta cuenta.
          </p>
          <PanelForm
            initialValues={{}}
            validate={() => ({})}
            onSave={async () => {
              await mutarPanel('/pagos/cancelar-suscripcion-inmediatamente', 'POST', {});
              await recargar();
            }}
            onSaved={() => setConfirmarInmediata(false)}
          >
            <PanelSubmitButton pendingText="Cancelando…">
              Confirmar cancelación inmediata
            </PanelSubmitButton>
          </PanelForm>
        </Modal.Body>
      </Modal>
    </>
  );
}
