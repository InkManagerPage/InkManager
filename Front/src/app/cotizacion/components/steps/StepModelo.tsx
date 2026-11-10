import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepModelo({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label
        className={styles.legend}
        style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}
      >
        ¿Sobre qué modelo planificamos el tatuaje?
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {['Mujer', 'Hombre'].map((genero) => (
          <button
            type="button"
            aria-pressed={values.generoLienzo === genero}
            key={genero}
            onClick={() => {
              if (values.generoLienzo === genero) return;
              setFieldValue('generoLienzo', genero);
              setFieldValue('marcasZona', []);
            }}
            style={{
              border: values.generoLienzo === genero ? '2px solid #202320' : '1px solid #cccec7',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'center',
              background: values.generoLienzo === genero ? '#f9f9f8' : '#fff',
            }}
          >
            <strong>{genero}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
