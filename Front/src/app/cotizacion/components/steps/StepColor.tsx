import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepColor({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label className={styles.legend} style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
        ¿Cómo prefieres el diseño?
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {[
          { label: 'A Color', val: true },
          { label: 'Blanco y Negro', val: false },
        ].map((item) => (
          <div
            key={String(item.val)}
            onClick={() => setFieldValue('esColor', item.val)}
            style={{
              border: values.esColor === item.val ? '2px solid #202320' : '1px solid #cccec7',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'center',
              background: values.esColor === item.val ? '#f9f9f8' : '#fff',
            }}
          >
            <div style={{ height: '110px', background: '#e5e7eb', borderRadius: '8px', marginBottom: '8px' }} />
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}