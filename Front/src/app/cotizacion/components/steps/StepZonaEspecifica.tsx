import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

const subZonasPorZona: Record<string, { id: string; label: string }[]> = {
  Brazo: [
    { id: 'Inner Arm', label: 'Parte interna' },
    { id: 'Outer Arm', label: 'Parte externa' },
    { id: 'Back Arm', label: 'Parte trasera' },
    { id: 'Sleeve', label: 'Manga completa' },
  ],
  Mano: [
    { id: 'Palm', label: 'Palma (Palm)' },
    { id: 'Top Hand / Fingers', label: 'Dorso / Dedos' },
  ],
  Torso: [
    { id: 'Ribs', label: 'Costillas (Ribs)' },
    { id: 'Back', label: 'Espalda (Back)' },
    { id: 'Chest / Stomach', label: 'Pecho / Abdomen' },
  ],
  Pierna: [
    { id: 'Front Leg', label: 'Parte delantera' },
    { id: 'Back Leg', label: 'Parte trasera / Gemelos' },
    { id: 'Outer Leg', label: 'Parte externa' },
    { id: 'Inner Leg', label: 'Parte interna' },
  ],
  'Cabeza / Cuello': [
    { id: 'Back', label: 'Nuca / Parte trasera' },
    { id: 'Side', label: 'Lateral / Perfil' },
    { id: 'Face / Neck', label: 'Rostro / Cuello frontal' },
  ],
};

export function StepZonaEspecifica({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label className={styles.legend} style={{ fontSize: '18px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
        Selecciona la parte específica ({values.zonaCuerpo || 'General'})
      </label>
      
      {values.zonaCuerpo && subZonasPorZona[values.zonaCuerpo] ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {subZonasPorZona[values.zonaCuerpo].map((sub) => (
            <div
              key={sub.id}
              onClick={() => setFieldValue('zonaEspecifica', sub.label)}
              style={{
                border: values.zonaEspecifica === sub.label ? '2px solid #202320' : '1px solid #cccec7',
                borderRadius: '10px',
                padding: '10px',
                cursor: 'pointer',
                textAlign: 'center',
                background: values.zonaEspecifica === sub.label ? '#f9f9f8' : '#fff',
              }}
            >
              <div style={{ height: '90px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '6px' }} />
              <span style={{ fontSize: '12px', fontWeight: 500 }}>{sub.label}</span>
            </div>
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