import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';
import { zonasCorporales } from '@/lib/ubicacion-tatuaje';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepZonaEspecifica({ values, setFieldValue }: StepProps) {
  const opciones = Object.keys(zonasCorporales[values.zonaCuerpo] ?? {});
  return (
    <div className={styles.field}>
      <label
        className={styles.legend}
        style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}
      >
        Seleccioná la parte específica ({values.zonaCuerpo || 'General'})
      </label>

      {opciones.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {opciones.map((sub) => (
            <button
              type="button"
              aria-pressed={values.zonaEspecifica === sub}
              key={sub}
              onClick={() => {
                if (values.zonaEspecifica === sub) return;
                setFieldValue('zonaEspecifica', sub);
                setFieldValue('marcasZona', []);
              }}
              style={{
                border: values.zonaEspecifica === sub ? '2px solid #202320' : '1px solid #cccec7',
                borderRadius: '10px',
                padding: '10px',
                cursor: 'pointer',
                textAlign: 'center',
                background: values.zonaEspecifica === sub ? '#f9f9f8' : '#fff',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500 }}>{sub}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            Por favor, regresa al paso anterior y selecciona una zona general.
          </p>
        </div>
      )}
    </div>
  );
}
