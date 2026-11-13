'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginModal } from '@/app/(auth)/Login/Login';
import { RegisterModal } from '@/app/(auth)/Register/Register';
import { usePanelData } from '@/hooks/usePanelData';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/store/AuthProvider';
import type { PrecioPlan } from '@/types/plan';
import styles from './checkout.module.css';

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function checkoutMercadoPago(valor: unknown) {
  if (typeof valor !== 'string') return null;
  try {
    const url = new URL(valor);
    const dominio = /(^|\.)mercadopago\.com(\.ar)?$/.test(url.hostname);
    return dominio && url.protocol === 'https:' && !url.port && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export default function CheckoutForm({ planId, cycleId }: { planId: string; cycleId: string }) {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const {
    datos,
    cargando,
    error: errorPlanes,
    recargar,
  } = usePanelData<{ plans: PrecioPlan[] }>('/pagos/planes');
  const [ciclo, setCiclo] = useState<'MENSUAL' | 'ANUAL'>(
    cycleId === 'ANUAL' ? 'ANUAL' : 'MENSUAL',
  );
  const [modal, setModal] = useState<'login' | 'register' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [conflicto, setConflicto] = useState(false);
  const plan = datos?.plans.find((item) => item.id === planId);
  const compatible =
    usuario &&
    (planId === 'ESTUDIO'
      ? usuario.rol === 'ESTUDIO_ADMIN'
      : usuario.rol === 'ARTISTA' && !usuario.estudioId);

  async function pagar() {
    if (!plan || !compatible || enviando) return;
    setError('');
    setConflicto(false);
    setEnviando(true);
    const comprador = correo?.trim().toLowerCase();
    try {
      const respuesta = await apiFetch('/pagos/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.id,
          ciclo,
          ...(ciclo === 'MENSUAL' && comprador && comprador !== usuario.email
            ? { payer_email: comprador }
            : {}),
        }),
      });
      const resultado = await respuesta.json();
      const url = checkoutMercadoPago(resultado.checkoutUrl);
      if (url) {
        window.location.assign(url);
        return;
      }
      if (resultado.paymentProcessing === true && typeof resultado.subscriptionId === 'string') {
        router.push(
          '/checkout/pending?subscription_id=' + encodeURIComponent(resultado.subscriptionId),
        );
        return;
      }
      throw new Error('Mercado Pago no devolvió un enlace válido.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar el pago.');
      setConflicto(e instanceof ApiError && e.status === 409);
      setEnviando(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/estudios#planes">
          ← Volver a los planes
        </Link>
        <header className={styles.heading}>
          <h1>{plan ? 'Plan ' + plan.nombre : 'Elegí tu plan'}</h1>
          <p>El pago se completa en Mercado Pago.</p>
        </header>

        {cargando || cargandoSesion ? (
          <p role="status">Cargando…</p>
        ) : errorPlanes ? (
          <div className={styles.feedbackError} role="alert">
            <p>{errorPlanes}</p>
            <button className={styles.secondaryButton} onClick={() => void recargar()}>
              Reintentar
            </button>
          </div>
        ) : !plan ? (
          <p role="alert">Elegí un plan disponible para continuar.</p>
        ) : (
          <div className={styles.checkoutGrid}>
            <section className={styles.formCard} aria-label="Facturación">
              <div className={styles.cycleOptions} aria-label="Frecuencia de pago">
                <button
                  className={styles.cycleOption}
                  aria-pressed={ciclo === 'MENSUAL'}
                  disabled={enviando}
                  onClick={() => {
                    setCiclo('MENSUAL');
                    setError('');
                    setConflicto(false);
                  }}
                >
                  <strong>Mensual</strong>
                  <span>{moneda.format(plan.mensual)} por mes</span>
                </button>
                <button
                  className={styles.cycleOption}
                  aria-pressed={ciclo === 'ANUAL'}
                  disabled={enviando}
                  onClick={() => {
                    setCiclo('ANUAL');
                    setError('');
                    setConflicto(false);
                  }}
                >
                  <strong>Anual</strong>
                  <span>{moneda.format(plan.anual)} por 12 meses</span>
                </button>
              </div>
              {!usuario ? (
                <div className={styles.authGate}>
                  <h2>Ingresá para continuar</h2>
                  <div className={styles.authActions}>
                    <button className={styles.submitButton} onClick={() => setModal('login')}>
                      Iniciar sesión
                    </button>
                    <button className={styles.secondaryButton} onClick={() => setModal('register')}>
                      Crear cuenta
                    </button>
                  </div>
                </div>
              ) : compatible ? (
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void pagar();
                  }}
                >
                  {ciclo === 'MENSUAL' && (
                    <label className={styles.field}>
                      Correo de tu cuenta de Mercado Pago
                      <input
                        type="email"
                        name="payer_email"
                        autoComplete="email"
                        spellCheck={false}
                        maxLength={254}
                        required
                        disabled={enviando}
                        value={correo ?? usuario.email}
                        onChange={(event) => setCorreo(event.target.value)}
                      />
                    </label>
                  )}
                  <button type="submit" className={styles.submitButton} disabled={enviando}>
                    {enviando ? 'Abriendo Mercado Pago…' : 'Continuar a Mercado Pago'}
                  </button>
                </form>
              ) : (
                <p role="alert">
                  Este plan es para{' '}
                  {plan.id === 'ESTUDIO' ? 'titulares de estudio' : 'artistas independientes'}.
                </p>
              )}
              {error && (
                <p className={styles.formError} role="alert">
                  {error}
                  {conflicto && (
                    <>
                      {' '}
                      <Link
                        href={
                          plan.id === 'ESTUDIO' ? '/estudio/suscripcion' : '/artista/suscripcion'
                        }
                      >
                        Ver mi suscripción
                      </Link>
                    </>
                  )}
                </p>
              )}
            </section>
            <aside className={styles.summary} aria-label="Resumen de la compra">
              <h2>Total</h2>
              <p className={styles.summaryPrice}>
                {moneda.format(ciclo === 'ANUAL' ? plan.anual : plan.mensual)}
              </p>
              <div className={styles.summaryDivider} />
              <p>
                {ciclo === 'ANUAL'
                  ? 'Un pago por 12 meses de acceso.'
                  : 'Renovación automática cada mes.'}
              </p>
            </aside>
          </div>
        )}
      </div>
      <LoginModal
        show={modal === 'login'}
        onHide={() => setModal(null)}
        onSwitch={() => setModal('register')}
      />
      <RegisterModal
        show={modal === 'register'}
        onHide={() => setModal(null)}
        onSwitch={() => setModal('login')}
        contexto="profesional"
      />
    </main>
  );
}
