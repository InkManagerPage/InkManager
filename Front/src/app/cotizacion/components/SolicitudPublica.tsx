'use client';

import { useRef, useState } from 'react';
import { CotizacionForm } from '@/components/forms/CotizacionForm';
import styles from '@/components/auth/auth.module.css';
import { crearSolicitud } from '@/services/cotizacion.service';
import type { CotizacionValues } from '@/types/cotizacion';

export function SolicitudPublica({
  destino,
  enlaceInstagram,
}: {
  destino: { estudio: string } | { artista: string };
  enlaceInstagram?: string;
}) {
  const claveEnvio = useRef<string>(null);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState('');

  async function enviar(values: CotizacionValues) {
    setError('');
    try {
      claveEnvio.current ??= crypto.randomUUID();
      await crearSolicitud(values, destino, claveEnvio.current, enlaceInstagram);
      setEnviada(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos enviar la consulta.');
    }
  }

  return enviada ? (
    <div className={styles.successPanel} role="status">
      <h2 className={styles.successTitle}>Consulta enviada</h2>
      <p className={styles.successText}>
        {enlaceInstagram
          ? 'Volvé al chat de Instagram para seguir con tu consulta.'
          : 'El equipo ya tiene los datos de tu idea.'}
      </p>
    </div>
  ) : (
    <CotizacionForm pedirContacto onSubmit={enviar} error={error} />
  );
}
