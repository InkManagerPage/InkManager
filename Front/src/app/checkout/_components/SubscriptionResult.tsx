'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useAuth } from '@/store/AuthProvider';
import styles from './subscription-result.module.css';

type ResultStatus = 'checking' | 'pending' | 'active' | 'failed' | 'error';

function isSubscriptionStatus(
  value: unknown,
): value is 'PENDIENTE' | 'ACTIVA' | 'PAUSADA' | 'CANCELADA' | 'RECHAZADA' | 'ERROR' | 'VENCIDA' {
  return (
    value === 'PENDIENTE' ||
    value === 'ACTIVA' ||
    value === 'PAUSADA' ||
    value === 'CANCELADA' ||
    value === 'RECHAZADA' ||
    value === 'ERROR' ||
    value === 'VENCIDA'
  );
}

function isPlanSuscripcion(value: unknown): value is 'INDIVIDUAL' | 'ESTUDIO' {
  return value === 'INDIVIDUAL' || value === 'ESTUDIO';
}

export default function SubscriptionResult({ subscriptionId }: { subscriptionId: string }) {
  const { reintentar } = useAuth();
  const [status, setStatus] = useState<ResultStatus>('checking');
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  const validId = /^[\da-f-]{36}$/i.test(subscriptionId);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    async function consultarEstado() {
      try {
        const ruta = `pagos/suscripcion/${encodeURIComponent(subscriptionId)}`;
        const signal = controller.signal;
        const response = attempts % 4 === 0
          ? await apiFetch(ruta + '/verificar', { method: 'POST', signal }).catch((error) => {
              if (error instanceof ApiError && [429, 502, 503].includes(error.status)) {
                return apiFetch(ruta, { signal });
              }
              throw error;
            })
          : await apiFetch(ruta, { signal });
        const body: unknown = await response.json();
        if (
          typeof body !== 'object' ||
          body === null ||
          !('subscription' in body) ||
          typeof body.subscription !== 'object' ||
          body.subscription === null ||
          !('estado' in body.subscription)
        ) {
          throw new Error('No pudimos consultar el estado de la suscripción.');
        }

        const subscription = body.subscription as Record<string, unknown>;
        const estado = subscription.estado;
        
        if (!isSubscriptionStatus(estado)) {
          throw new Error('Estado de suscripción inválido.');
        }

        const plan = isPlanSuscripcion(subscription.plan) ? subscription.plan : null;
        setPlan(plan);

        if (estado === 'ACTIVA') {
          setStatus('active');
          // Revalidar la sesión para que el usuario vea los nuevos permisos
          try {
            reintentar();
          } catch {
            console.error('No pudimos revalidar la sesión');
          }
          return;
        }
        if (estado === 'RECHAZADA' || estado === 'ERROR' || estado === 'CANCELADA') {
          setStatus('failed');
          return;
        }

        setStatus('pending');
        attempts += 1;
        if (attempts < 12) timer = setTimeout(consultarEstado, 2500);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setStatus('error');
        setMessage(
          cause instanceof ApiError && cause.status === 401
            ? 'Iniciá sesión con la cuenta que usaste para suscribirte y volvé a consultar el estado.'
            : cause instanceof Error
              ? cause.message
              : 'No pudimos consultar la suscripción.',
        );
      }
    }

    if (validId) void consultarEstado();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [subscriptionId, validId, reintentar]);

  const estadoVisible = validId ? status : 'error';
  const mensajeVisible = validId ? message : 'El identificador de suscripción no es válido.';
  const pendiente = estadoVisible === 'pending' || estadoVisible === 'checking';
  const fallo = estadoVisible === 'failed' || estadoVisible === 'error';

  const planLabel =
    plan === 'INDIVIDUAL'
      ? 'plan Individual'
      : plan === 'ESTUDIO'
        ? 'plan Estudio'
        : 'tu plan';

  return (
    <main className={styles.page}>
      <section
        className={`${styles.card} ${estadoVisible === 'active' ? styles.success : ''} ${fallo ? styles.failure : ''}`}
      >
        <div className={styles.icon} aria-hidden="true">
          {pendiente ? (
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="17" />
              <path d="M24 14v11l7 4" />
            </svg>
          ) : estadoVisible === 'active' ? (
            <svg viewBox="0 0 48 48" fill="none">
              <path d="m14 24 7 7 14-15" />
            </svg>
          ) : (
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M16 16l16 16M32 16 16 32" />
              <circle cx="24" cy="24" r="17" />
            </svg>
          )}
        </div>
        <p className={styles.eyebrow}>Mercado Pago</p>
        <h1>
          {estadoVisible === 'active'
            ? '¡Tu suscripción está activa!'
            : fallo
              ? 'No pudimos confirmar el pago'
              : 'Estamos verificando tu suscripción'}
        </h1>
        <p className={styles.description}>
          {estadoVisible === 'active'
            ? `¡Felicidades! Acabás de contratar ${planLabel}. Ya tenés acceso completo a todas las funcionalidades. Gracias por confiar en InkManager.`
            : fallo
              ? mensajeVisible ||
                'La suscripción no se completó. Podés revisar tus datos e intentarlo nuevamente.'
              : 'Mercado Pago está confirmando el estado. Esta página se actualizará automáticamente.'}
        </p>
        <div className={styles.actions}>
          {estadoVisible === 'active' ? (
            <>
              <Link
                className={styles.primaryButton}
                href={plan === 'ESTUDIO' ? '/estudio/suscripcion' : '/artista/suscripcion'}
              >
                Ir a mi suscripción <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.secondaryButton} href="/">
                Volver al inicio
              </Link>
            </>
          ) : fallo ? (
            <>
              <Link className={styles.primaryButton} href="/estudios#planes">
                Volver a los planes <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.secondaryButton} href="/">
                Volver al inicio
              </Link>
            </>
          ) : (
            <Link className={styles.primaryButton} href="/">
              Volver al inicio <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        {pendiente && (
          <p className={styles.note}>No cierres esta página mientras verificamos el estado.</p>
        )}
      </section>
    </main>
  );
}
