'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import styles from './suscripcion.module.css';

export function CancelarSuscripcion({ token }: { token: string }) {
  const [procesando, setProcesando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [error, setError] = useState('');

  async function cancelar() {
    setProcesando(true);
    setError('');
    try {
      await apiFetch('/pagos/cancelar-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setCancelada(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cancelar la suscripción.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="cancelar-title">
        <p className={styles.eyebrow}>Suscripción InkManager</p>
        <h1 id="cancelar-title">{cancelada ? 'Renovación cancelada' : 'Cancelar renovación'}</h1>
        {cancelada ? (
          <p>
            La suscripción fue cancelada. No se realizarán nuevos cobros y conservarás el acceso
            hasta el final del período abonado.
          </p>
        ) : token ? (
          <>
            <p>Confirmá si querés cancelar la renovación automática de tu suscripción.</p>
            <button
              type="button"
              className={styles.submit}
              onClick={cancelar}
              disabled={procesando}
            >
              {procesando ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </>
        ) : (
          <p className={styles.error} role="alert">
            El enlace de cancelación no es válido. Usá el enlace recibido por correo.
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Link className={styles.back} href="/estudios">
          Volver a InkManager
        </Link>
      </section>
    </main>
  );
}
