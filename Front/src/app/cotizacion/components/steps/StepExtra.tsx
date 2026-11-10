import type { PasoCotizacionProps } from '@/types/cotizacion';
import styles from '../cotizacion.module.css';

export function StepExtra({ values, setFieldValue }: PasoCotizacionProps) {
  return (
    <div className={styles.respuestas}>
      {[true, false].map((valor) => (
        <label key={String(valor)} className={styles.respuesta}>
          <input
            type="radio"
            name="tatuajes-previos"
            checked={values.tieneTatuajesPrevios === valor}
            onChange={() => setFieldValue('tieneTatuajesPrevios', valor)}
          />
          {valor ? 'Sí, ya tengo' : 'No, es mi primer tatuaje'}
        </label>
      ))}
    </div>
  );
}
