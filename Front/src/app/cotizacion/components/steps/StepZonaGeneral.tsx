import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

const zonasCorporalesGenerales = ['Brazo', 'Mano', 'Torso', 'Pierna', 'Cabeza / Cuello'];

export function StepZonaGeneral({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label className={styles.legend} style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
        ¿En qué zona general del cuerpo?
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {zonasCorporalesGenerales.map((zona) => (
          <div
            key={zona}
            onClick={() => {
              setFieldValue('zonaCuerpo', zona);
              setFieldValue('zonaEspecifica', ''); // Resetea la específica al cambiar la general
            }}
            style={{
              border: values.zonaCuerpo === zona ? '2px solid #202320' : '1px solid #cccec7',
              borderRadius: '10px',
              padding: '12px',
              cursor: 'pointer',
              textAlign: 'center',
              background: values.zonaCuerpo === zona ? '#f9f9f8' : '#fff',
            }}
          >
            <div style={{ height: '80px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '6px' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{zona}</span>
          </div>
        ))}
      </div>
    </div>
  );
}