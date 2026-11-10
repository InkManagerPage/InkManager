'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';

import { EmptyState, PageHeader, PanelIcon } from './PanelUI';
import { useDiscardChanges, useUnsavedChanges } from '@/components/forms/UnsavedChanges';
import { cantidad, moneda, mostrarFecha } from '@/lib/panel-artista';
import { nombreCiclo } from '@/lib/suscripcion-panel';
import type { SuscripcionPanel, CicloPlan, CobroPanel } from '@/types/suscripcion';
import { apiFetch } from '@/lib/api-client';
import styles from '@/components/panel/workspace.module.css';
import plan from './subscription.module.css';

type SuscripcionMercadoPago = {
  id: string;
  estado: 'PENDIENTE' | 'ACTIVA' | 'PAUSADA';
  plan: 'INDIVIDUAL' | 'ESTUDIO';
  ciclo: CicloPlan;
  importe: number;
  periodoFinAt: string | null;
  proximoPagoAt: string | null;
};

function leerSuscripcion(value: unknown): SuscripcionMercadoPago | null {
  if (typeof value !== 'object' || value === null || !('subscription' in value)) return null;
  const subscription = value.subscription;
  if (subscription === null) return null;
  if (typeof subscription !== 'object' || subscription === null) {
    throw new Error('La respuesta de suscripción no es válida.');
  }
  const data = subscription as Record<string, unknown>;
  if (
    typeof data.id !== 'string' ||
    (data.estado !== 'PENDIENTE' && data.estado !== 'ACTIVA' && data.estado !== 'PAUSADA') ||
    (data.plan !== 'INDIVIDUAL' && data.plan !== 'ESTUDIO') ||
    (data.ciclo !== 'MENSUAL' && data.ciclo !== 'ANUAL') ||
    (typeof data.importe !== 'number' && typeof data.importe !== 'string')
  ) {
    throw new Error('La respuesta de suscripción no es válida.');
  }
  const importe = Number(data.importe);
  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error('El importe de la suscripción no es válido.');
  }
  return {
    id: data.id,
    estado: data.estado,
    plan: data.plan,
    ciclo: data.ciclo,
    importe,
    periodoFinAt: typeof data.periodoFinAt === 'string' ? data.periodoFinAt : null,
    proximoPagoAt: typeof data.proximoPagoAt === 'string' ? data.proximoPagoAt : null,
  };
}

export function PanelSubscription({
  suscripcion,
  nombrePlan,
  precio,
  cambiarCiclo,
  cancelarRenovacion,
  reactivarRenovacion,
}: {
  suscripcion: Omit<SuscripcionPanel, 'plan'>;
  nombrePlan: string;
  precio: (ciclo: CicloPlan) => number;
  cambiarCiclo: (ciclo: CicloPlan) => void;
  cancelarRenovacion: () => void;
  reactivarRenovacion: () => void;
}) {
  const [accion, setAccion] = useState<'CICLO' | 'CANCELAR' | null>(null);
  const [ciclo, setCiclo] = useState<CicloPlan>(suscripcion.cicloProximo || suscripcion.ciclo);
  const [detalle, setDetalle] = useState<CobroPanel | null>(null);
  const [aviso, setAviso] = useState('');
  const [suscripcionReal, setSuscripcionReal] = useState<SuscripcionMercadoPago | null>(null);
  const [consultaReal, setConsultaReal] = useState(true);
  const [errorReal, setErrorReal] = useState('');
  const [cancelandoReal, setCancelandoReal] = useState(false);
  const [confirmarCancelacionReal, setConfirmarCancelacionReal] = useState(false);
  const confirmClose = useDiscardChanges();
  useUnsavedChanges(
    accion === 'CICLO' && ciclo !== (suscripcion.cicloProximo || suscripcion.ciclo),
  );
  const cancelada = suscripcion.estado === 'CANCELACION_PROGRAMADA';
  useEffect(() => {
    const controller = new AbortController();
    async function consultarSuscripcion() {
      try {
        const response = await apiFetch('payments/subscriptions/current', {
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        setSuscripcionReal(leerSuscripcion(body));
        setErrorReal('');
      } catch (cause) {
        if (controller.signal.aborted) return;
        setErrorReal(
          cause instanceof Error ? cause.message : 'No pudimos consultar tu suscripción.',
        );
      } finally {
        if (!controller.signal.aborted) setConsultaReal(false);
      }
    }
    void consultarSuscripcion();
    return () => controller.abort();
  }, []);

  async function cancelarSuscripcionReal() {
    setCancelandoReal(true);
    setErrorReal('');
    try {
      await apiFetch('payments/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setSuscripcionReal(null);
      setConfirmarCancelacionReal(false);
      setAviso('Suscripción cancelada. El acceso al plan quedó desactivado.');
    } catch (cause) {
      setErrorReal(cause instanceof Error ? cause.message : 'No pudimos cancelar la suscripción.');
    } finally {
      setCancelandoReal(false);
    }
  }

  const mostrarPanelAnterior = !consultaReal && suscripcionReal?.estado === 'ACTIVA';
  return (
    <>
      <PageHeader titulo="Suscripción" descripcion="Tu plan, próximos vencimientos y pagos." />
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <section className={`${styles.surface} mb-4`} aria-labelledby="mercadopago-subscription">
        <div className={styles.surfaceHeading}>
          <h2 id="mercadopago-subscription">Suscripción de Mercado Pago</h2>
          <PanelIcon nombre="suscripcion" size={18} />
        </div>
        <div className={styles.surfaceBody}>
          {consultaReal ? (
            <p className={styles.description} role="status">
              Consultando tu plan...
            </p>
          ) : errorReal && !suscripcionReal ? (
            <p className={styles.notice} role="alert">
              {errorReal}
            </p>
          ) : suscripcionReal ? (
            <>
              <dl className={plan.billingDetails}>
                <div>
                  <dt>Plan</dt>
                  <dd>{suscripcionReal.plan === 'ESTUDIO' ? 'Estudio' : 'Individual'}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    {suscripcionReal.estado === 'ACTIVA'
                      ? 'Activo'
                      : suscripcionReal.estado === 'PAUSADA'
                        ? 'Pausado'
                        : 'Pendiente de confirmación'}
                  </dd>
                </div>
                <div>
                  <dt>Facturación</dt>
                  <dd>
                    {moneda(suscripcionReal.importe)} por{' '}
                    {nombreCiclo(suscripcionReal.ciclo).toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt>
                    {suscripcionReal.ciclo === 'ANUAL' ? 'Acceso hasta' : 'Próxima renovación'}
                  </dt>
                  <dd>
                    {(suscripcionReal.periodoFinAt ?? suscripcionReal.proximoPagoAt)
                      ? mostrarFecha(
                          suscripcionReal.periodoFinAt ?? suscripcionReal.proximoPagoAt ?? '',
                          { day: 'numeric', month: 'long', year: 'numeric' },
                        )
                      : 'A confirmar'}
                  </dd>
                </div>
              </dl>
              {errorReal && (
                <p className={styles.notice} role="alert">
                  {errorReal}
                </p>
              )}
              <button
                type="button"
                className={plan.cancelNowButton}
                onClick={() => setConfirmarCancelacionReal(true)}
                disabled={cancelandoReal}
              >
                Cancelar plan ahora
              </button>
            </>
          ) : (
            <>
              <p className={styles.description}>
                No tenés un plan activo. Elegí la suscripción mensual o anual que mejor se adapte a
                tu negocio y continuá al checkout seguro para completar el pago con tarjeta.
              </p>
              <Link
                href="/estudios#planes"
                className={styles.button}
                aria-label="Suscribirme ahora: elegir plan y frecuencia de pago"
              >
                Suscribirme ahora <PanelIcon nombre="flecha" size={16} />
              </Link>
            </>
          )}
        </div>
      </section>
      {mostrarPanelAnterior && (
        <>
          <div className={plan.summary}>
            <section className={plan.currentPlan} aria-labelledby="current-plan">
              <div className={plan.planEyebrow}>
                <span>Tu plan</span>
                <span
                  className={`${styles.status} ${cancelada ? styles.statusPending : styles.statusGood}`}
                >
                  {cancelada ? 'Cancelación programada' : 'Activo'}
                </span>
              </div>
              <h2 id="current-plan">{nombrePlan}</h2>
              <p>Todo tu trabajo, en un mismo lugar.</p>
              <div className={plan.price}>
                <strong>{moneda(precio(suscripcion.ciclo))}</strong>
                <span>por {suscripcion.ciclo === 'ANUAL' ? 'año' : 'mes'}</span>
              </div>
              <ul>
                {[
                  nombrePlan === 'Estudio'
                    ? 'Gestión del equipo y propuestas'
                    : 'Perfil y portafolio público',
                  'Gestión de consultas y clientes',
                  'Agenda y recordatorios',
                  'Mensajes y seguimiento',
                ].map((item) => (
                  <li key={item}>
                    <PanelIcon nombre="check" size={15} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className={styles.secondaryButton}
                disabled={cancelada}
                onClick={() => {
                  setCiclo(suscripcion.cicloProximo || suscripcion.ciclo);
                  setAccion('CICLO');
                }}
              >
                Modificar facturación
                <PanelIcon nombre="flecha" size={16} />
              </button>
            </section>
            <section className={styles.surface} aria-labelledby="billing-title">
              <div className={styles.surfaceHeading}>
                <h2 id="billing-title">Facturación</h2>
                <PanelIcon nombre="suscripcion" size={18} />
              </div>
              <div className={styles.surfaceBody}>
                <dl className={plan.billingDetails}>
                  <div>
                    <dt>Período actual</dt>
                    <dd>
                      {mostrarFecha(suscripcion.inicioPeriodo)} —{' '}
                      {mostrarFecha(suscripcion.finPeriodo, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Frecuencia</dt>
                    <dd>{nombreCiclo(suscripcion.ciclo)}</dd>
                  </div>
                  <div>
                    <dt>{cancelada ? 'Acceso disponible hasta' : 'Próxima renovación'}</dt>
                    <dd>
                      {mostrarFecha(suscripcion.finPeriodo, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Próximo importe</dt>
                    <dd>
                      {cancelada
                        ? 'Sin renovación'
                        : moneda(precio(suscripcion.cicloProximo || suscripcion.ciclo))}
                    </dd>
                  </div>
                </dl>
                {suscripcion.cicloProximo && !cancelada && (
                  <p className={styles.notice}>
                    Tu facturación cambiará a {nombreCiclo(suscripcion.cicloProximo).toLowerCase()}{' '}
                    en la próxima renovación.
                  </p>
                )}
                {cancelada ? (
                  <>
                    <p className={styles.description}>
                      Tu plan sigue disponible hasta el final del período actual.
                    </p>
                    <button
                      className={styles.button}
                      onClick={() => {
                        reactivarRenovacion();
                        setAviso('Renovación automática reactivada.');
                      }}
                    >
                      Reactivar renovación
                    </button>
                  </>
                ) : (
                  <button className={styles.textButton} onClick={() => setAccion('CANCELAR')}>
                    Cancelar renovación automática
                  </button>
                )}
              </div>
            </section>
          </div>
          <section className={`${styles.surface} mt-4`} aria-labelledby="payment-history">
            <div className={styles.surfaceHeading}>
              <h2 id="payment-history">Historial de pagos</h2>
              <small>{cantidad(suscripcion.cobros.length, 'pago')}</small>
            </div>
            {!suscripcion.cobros.length ? (
              <EmptyState
                titulo="Todavía no tenés pagos"
                detalle="Los pagos de tu plan aparecerán acá."
              />
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>
                        <span className="visually-hidden">Detalle</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suscripcion.cobros.map((cobro) => (
                      <tr key={cobro.id}>
                        <td>
                          {mostrarFecha(cobro.fecha, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className={styles.muted}>{cobro.concepto}</td>
                        <td className={styles.money}>{moneda(cobro.importe)}</td>
                        <td>
                          <span
                            className={`${styles.status} ${cobro.estado === 'APROBADO' ? styles.statusGood : cobro.estado === 'RECHAZADO' ? styles.statusError : styles.statusPending}`}
                          >
                            {cobro.estado === 'APROBADO'
                              ? 'Aprobado'
                              : cobro.estado === 'PENDIENTE'
                                ? 'Pendiente'
                                : 'Rechazado'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.textButton}
                            onClick={() => setDetalle(cobro)}
                            aria-label={`Ver pago del ${mostrarFecha(cobro.fecha)}`}
                          >
                            Ver detalle
                            <PanelIcon nombre="chevron" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {nombrePlan === 'Individual' && (
            <div className={plan.studioPlan}>
              <div>
                <strong>¿Vas a trabajar con un equipo?</strong>
                <p>El plan Estudio permite coordinar artistas y administrar el negocio.</p>
              </div>
              <Link href="/estudios#planes" className={styles.textButton}>
                Conocer el plan Estudio
                <PanelIcon nombre="flecha" size={16} />
              </Link>
            </div>
          )}
          <Modal show={Boolean(accion)} onHide={() => confirmClose(() => setAccion(null))} centered>
            <Modal.Header closeButton closeLabel="Cerrar">
              <Modal.Title as="h2" className="fs-5">
                {accion === 'CICLO' ? 'Modificar facturación' : 'Cancelar renovación'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {accion === 'CICLO' ? (
                <>
                  <fieldset>
                    <legend className={styles.miniTitle}>Frecuencia del plan {nombrePlan}</legend>
                    {(['MENSUAL', 'ANUAL'] as const).map((opcion) => (
                      <label
                        className={`${plan.cycleOption} ${ciclo === opcion ? plan.cycleSelected : ''}`}
                        key={opcion}
                      >
                        <input
                          type="radio"
                          name="subscription-cycle"
                          value={opcion}
                          checked={ciclo === opcion}
                          onChange={() => setCiclo(opcion)}
                        />
                        <span>
                          <strong>{nombreCiclo(opcion)}</strong>
                          <small>
                            {opcion === 'ANUAL'
                              ? '12 meses por el valor de 10'
                              : 'Renovación mes a mes'}
                          </small>
                        </span>
                        <b>{moneda(precio(opcion))}</b>
                      </label>
                    ))}
                  </fieldset>
                  <p className={`${styles.muted} mt-3`}>
                    El cambio se aplica el{' '}
                    {mostrarFecha(suscripcion.finPeriodo, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    . Conservás tu período actual.
                  </p>
                  <div className={styles.formActions}>
                    <button
                      className={styles.textButton}
                      onClick={() => confirmClose(() => setAccion(null))}
                    >
                      Mantener facturación
                    </button>
                    <button
                      className={styles.button}
                      onClick={() => {
                        cambiarCiclo(ciclo);
                        setAccion(null);
                        setAviso(
                          ciclo === suscripcion.ciclo
                            ? 'Se conserva la facturación actual.'
                            : 'Cambio de facturación programado.',
                        );
                      }}
                    >
                      Guardar cambio
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.description}>
                    Conservás el acceso hasta el{' '}
                    {mostrarFecha(suscripcion.finPeriodo, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    . Después no se renovará automáticamente el plan.
                  </p>
                  <div className={styles.formActions}>
                    <button className={styles.secondaryButton} onClick={() => setAccion(null)}>
                      Mantener renovación
                    </button>
                    <button
                      className={styles.button}
                      onClick={() => {
                        cancelarRenovacion();
                        setAccion(null);
                        setAviso('Renovación automática cancelada al finalizar el período.');
                      }}
                    >
                      Confirmar cancelación
                    </button>
                  </div>
                </>
              )}
            </Modal.Body>
          </Modal>
          <Modal show={Boolean(detalle)} onHide={() => setDetalle(null)} centered>
            <Modal.Header closeButton closeLabel="Cerrar">
              <Modal.Title as="h2" className="fs-5">
                Detalle del pago
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {detalle && (
                <dl className={plan.billingDetails}>
                  <div>
                    <dt>Referencia</dt>
                    <dd>{detalle.id}</dd>
                  </div>
                  <div>
                    <dt>Concepto</dt>
                    <dd>{detalle.concepto}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>
                      {mostrarFecha(detalle.fecha, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Importe</dt>
                    <dd>{moneda(detalle.importe)}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      {detalle.estado === 'APROBADO'
                        ? 'Aprobado'
                        : detalle.estado === 'PENDIENTE'
                          ? 'Pendiente'
                          : 'Rechazado'}
                    </dd>
                  </div>
                </dl>
              )}
            </Modal.Body>
          </Modal>
        </>
      )}
      <Modal
        show={confirmarCancelacionReal}
        onHide={() => setConfirmarCancelacionReal(false)}
        centered
      >
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Cancelar plan ahora
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Se cancelará la renovación en Mercado Pago y perderás acceso al plan inmediatamente. No
            se realizará un reembolso automático del importe cobrado.
          </p>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setConfirmarCancelacionReal(false)}
              disabled={cancelandoReal}
            >
              Mantener mi plan
            </button>
            <button
              type="button"
              className={plan.cancelNowButton}
              onClick={() => void cancelarSuscripcionReal()}
              disabled={cancelandoReal}
            >
              {cancelandoReal ? 'Cancelando...' : 'Confirmar cancelación'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
