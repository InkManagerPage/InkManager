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
    async function cargarEstilos() {
      try {
        setCargando(true);
        setError('');

        const response = await apiFetch('/estilos');

        if (!response.ok) {
          throw new Error('Error al cargar los estilos.');
        }

        const estilos: string[] = await response.json();

        setEstilosDisponibles(estilos);
      } catch {
        setError('No se pudieron cargar los estilos. Intenta nuevamente.');
      } finally {
        setCargando(false);
      }
    }

    cargarEstilos();
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
        <option value="">
          {cargando ? 'Cargando estilos...' : 'Selecciona un estilo...'}
        </option>

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