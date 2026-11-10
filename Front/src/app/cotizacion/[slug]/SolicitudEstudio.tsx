'use client';

import { useRef, useState } from 'react';
import { CotizacionForm } from '@/components/forms/CotizacionForm';
import styles from '@/components/auth/auth.module.css';
import { crearSolicitud } from '@/services/cotizacion.service';
import type { CotizacionValues } from '@/types/cotizacion';

export function SolicitudEstudio({ slug }: { slug: string }) {
  const claveEnvio = useRef<string>(null);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState('');

  async function enviar(values: CotizacionValues) {
    setError('');
    try {
      claveEnvio.current ??= crypto.randomUUID();
      await crearSolicitud(values, slug, claveEnvio.current);
      setEnviada(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos enviar la consulta.');
    }
  }

  return enviada ? (
    <div className={styles.successPanel} role="status">
      <h2 className={styles.successTitle}>Consulta enviada</h2>
      <p className={styles.successText}>El estudio ya tiene los datos de tu idea.</p>
    </div>
  ) : (
    <CotizacionForm pedirContacto onSubmit={enviar} error={error} />
  );
}
