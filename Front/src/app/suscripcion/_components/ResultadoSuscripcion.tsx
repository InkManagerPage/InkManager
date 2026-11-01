'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthControls } from '@/components/auth/AuthControls';
import { apiFetch } from '@/lib/api-client';
import styles from './suscripcion.module.css';

type EstadoSuscripcion = 'PENDIENTE' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | 'ERROR';
type DatosSuscripcion = {
  suscripcion: {
    plan: string;
    ciclo: string;
    estado: EstadoSuscripcion;
  } | null;
};

const estados: Record<EstadoSuscripcion, string> = {
  PENDIENTE: 'Mercado Pago todavía está confirmando el primer pago.',
  ACTIVA: 'Tu suscripción está activa.',
  VENCIDA: 'El pago no se pudo completar. Revisá tu medio de pago en Mercado Pago.',
  CANCELADA: 'La renovación de tu suscripción está cancelada.',
  ERROR: 'No se pudo iniciar el checkout. Volvé a elegir un plan.',
};

export function ResultadoSuscripcion() {
  const [estado, setEstado] = useState<EstadoSuscripcion | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    async function consultar(intento: number) {
      try {
        const response = await apiFetch('/pagos/suscripcion', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const resultado: DatosSuscripcion = await response.json();
        if (cancelado) return;
        if (!resultado.suscripcion) {
          setError('No encontramos una suscripción asociada a esta cuenta.');
          return;
        }
        setEstado(resultado.suscripcion.estado);
        if (resultado.suscripcion.estado === 'PENDIENTE' && intento < 8) {
          temporizador = setTimeout(() => void consultar(intento + 1), 2500);
        }
      } catch (cause) {
        if (!cancelado) {
          setError(cause instanceof Error ? cause.message : 'No pudimos consultar el pago.');
        }
      }
    }

    void consultar(0);
    return () => {
      cancelado = true;
      controller.abort();
      clearTimeout(temporizador);
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="resultado-title">
        <p className={styles.eyebrow}>Suscripción InkManager</p>
        <h1 id="resultado-title">Estado del pago</h1>
        {estado ? (
          <p role="status">{estados[estado]}</p>
        ) : !error ? (
          <p role="status">Consultando a Mercado Pago…</p>
        ) : null}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {estado === 'ACTIVA' && (
          <p>
            Te enviaremos por correo el detalle del plan y un enlace seguro para cancelar la
            renovación.
          </p>
        )}
        {error && (
          <div className={styles.auth}>
            <p>Si completaste el pago, iniciá sesión con la cuenta usada para suscribirte.</p>
            <AuthControls contextoRegistro="profesional" />
          </div>
        )}
        <Link className={styles.back} href="/estudios#planes">
          Volver a InkManager
        </Link>
      </section>
    </main>
  );
}
