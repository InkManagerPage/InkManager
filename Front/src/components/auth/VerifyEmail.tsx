'use client';

import { useState } from 'react';
import { verificarEmailCuenta } from '@/services/auth.service';
import { RequestEmailForm } from '@/components/forms/RequestEmailForm';
import styles from './auth.module.css';

export function VerifyEmail() {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'listo' | 'error'>('inicial');
  const [error, setError] = useState('');
  async function confirmar() {
    setEstado('enviando');
    try {
      await verificarEmailCuenta(window.location.hash.slice(1));
      window.history.replaceState(null, '', window.location.pathname);
      setEstado('listo');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos verificar tu email.');
      setEstado('error');
    }
  }
  if (estado === 'listo')
    return (
      <p role="status" className={styles.success}>
        Tu email ya está verificado. Gracias por confirmar tus datos.
      </p>
    );
  return (
    <>
      <p className={styles.intro}>Confirmá tu email para mantener tu cuenta al día.</p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <button
        type="button"
        className={styles.submit}
        onClick={confirmar}
        disabled={estado === 'enviando'}
      >
        {estado === 'enviando' ? 'Verificando…' : 'Confirmar mi email'}
      </button>
      {estado === 'error' && (
        <div className="mt-4">
          <RequestEmailForm verificar />
        </div>
      )}
    </>
  );
}
