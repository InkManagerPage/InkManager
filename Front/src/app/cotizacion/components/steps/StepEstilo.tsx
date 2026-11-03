import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

const estilosDisponibles = [
  'Tradicional / Old School',
  'Realismo',
  'Neo tradicional',
  'Blackwork',
  'Fine Line / Línea fina',
  'Japonés',
  'Tribal / Maorí',
  'Otro',
];

export function StepEstilo({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="estilo" className={styles.legend}>Selecciona el estilo preferido</label>
      <select
        id="estilo"
        value={values.estilo}
        onChange={(e) => setFieldValue('estilo', e.target.value)}
        className={`form-control ${styles.input}`}
        style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
        required
      >
        <option value="">Selecciona un estilo...</option>
        {estilosDisponibles.map((est) => (
          <option key={est} value={est}>{est}</option>
        ))}
      </select>
    </div>
  );
}