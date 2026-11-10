import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepUbicacionArea({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="tamano" className={styles.legend}>
        Tamaño aproximado (opcional)
      </label>
      <input
        id="tamano"
        className={styles.input}
        value={values.tamanoProporcion}
        maxLength={80}
        placeholder="Ej. 12 × 6 cm"
        onChange={(event) => setFieldValue('tamanoProporcion', event.target.value)}
      />
    </div>
  );
}
