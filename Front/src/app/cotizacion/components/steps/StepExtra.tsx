import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepExtra({ values, setFieldValue }: StepProps) {
  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="tiempoEstimado" className={styles.legend}>¿En cuánto tiempo te gustaría tatuarte?</label>
        <select
          id="tiempoEstimado"
          value={values.tiempoEstimado}
          onChange={(e) => setFieldValue('tiempoEstimado', e.target.value)}
          className={`form-control ${styles.input}`}
          style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px' }}
          required
        >
          <option value="">Selecciona un plazo...</option>
          <option value="Lo antes posible">Lo antes posible</option>
          <option value="En el próximo mes">En el próximo mes</option>
          <option value="En los próximos meses">En los próximos meses</option>
          <option value="Sin prisa">Sin prisa</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.legend} style={{ marginBottom: '12px' }}>¿Ya tienes tatuajes previos?</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[
            { label: 'Sí, ya tengo', val: true },
            { label: 'No, es el primero', val: false },
          ].map((item) => (
            <div
              key={String(item.val)}
              onClick={() => setFieldValue('tieneTatuajesPrevios', item.val)}
              style={{
                border: values.tieneTatuajesPrevios === item.val ? '2px solid #202320' : '1px solid #cccec7',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'center',
                background: values.tieneTatuajesPrevios === item.val ? '#f9f9f8' : '#fff',
              }}
            >
              <strong style={{ fontSize: '14px' }}>{item.label}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}