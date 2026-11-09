
import type { CotizacionValues } from '@/types/cotizacion';
import { MarcaInteractiva } from '../MarcaInteractiva';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepUbicacionArea({ values, setFieldValue }: StepProps) {
  return (
    <div className={styles.field}>
      <label
        className={styles.legend}
        style={{
          fontSize: '18px',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        Marca la ubicación exacta en el cuerpo
      </label>

      <MarcaInteractiva
        zonaGeneral={values.zonaCuerpo}
        zonaEspecifica={values.zonaEspecifica}
        onImageCaptured={(file) => {
          setFieldValue('imagenZonaMarcada', file);
        }}
      />
    </div>
  );
}
