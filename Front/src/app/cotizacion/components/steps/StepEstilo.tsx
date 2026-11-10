'use client';

import { useEffect, useState } from 'react';
import type { CotizacionValues } from '@/types/cotizacion';
import { apiFetch } from '@/lib/api-client';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepEstilo({ values, setFieldValue }: StepProps) {
  const [estilosDisponibles, setEstilosDisponibles] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controlador = new AbortController();
    async function cargarEstilos() {
      try {
        const response = await apiFetch('/estilos', { signal: controlador.signal });
        const estilos: string[] = await response.json();
        if (!controlador.signal.aborted) setEstilosDisponibles(estilos);
      } catch {
        if (!controlador.signal.aborted)
          setError('No pudimos cargar los estilos. Volvé al paso anterior e intentá de nuevo.');
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    void cargarEstilos();
    return () => controlador.abort();
  }, []);

  return (
    <div className={styles.field}>
      <label htmlFor="estilo" className={styles.legend}>
        Selecciona el estilo preferido
      </label>

      <select
        id="estilo"
        value={values.estilo}
        onChange={(e) => setFieldValue('estilo', e.target.value)}
        className={`form-control ${styles.input}`}
        style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
        disabled={cargando || !!error}
        required
      >
        <option value="">{cargando ? 'Cargando estilos...' : 'Selecciona un estilo...'}</option>

        {estilosDisponibles.map((estilo) => (
          <option key={estilo} value={estilo}>
            {estilo}
          </option>
        ))}
      </select>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
