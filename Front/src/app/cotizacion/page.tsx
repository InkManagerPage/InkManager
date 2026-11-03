'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CotizacionForm } from '@/components/forms/CotizacionForm';
import { crearSolicitud } from '@/services/cotizacion.service';
import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

export default function CotizacionPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit(values: CotizacionValues) {
    setError('');
    setSuccess(false);
    try {
      await crearSolicitud(values);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos enviar la cotización.');
    }
  }

  return (
    <main className={styles.accountPage}>
      <div className={styles.accountCard} style={{ maxWidth: '600px' }}>
        
        <div className="mb-6">
          <Link href="/" className={styles.eyebrow} style={{ display: 'inline-block', textDecoration: 'none' }}>
            ← Volver a InkManager
          </Link>
          <h1 style={{ fontSize: '34px', fontWeight: 500, letterSpacing: '-1.3px', margin: '0 0 10px' }}>
            Solicitar Presupuesto.
          </h1>
          <p className={styles.intro}>Cuéntanos los detalles de tu próximo tatuaje paso a paso.</p>
        </div>

        {success ? (
          <div className={styles.success}>
            <p className="font-semibold">¡Solicitud enviada con éxito!</p>
            <p className="text-sm mt-1">El estudio se pondrá en contacto contigo a la brevedad.</p>
            <Link 
              href="/" 
              className="mt-4 inline-block bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        ) : (
          <CotizacionForm onSubmit={submit} error={error} />
        )}

      </div>
    </main>
  );
}