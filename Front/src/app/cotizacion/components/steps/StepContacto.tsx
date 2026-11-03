import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (
    field: keyof CotizacionValues,
    value: unknown
  ) => void;
}

export function StepContacto({ values, setFieldValue }: StepProps) {
  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="nombre" className={styles.legend}>
          Nombre completo *
        </label>
        <input
          id="nombre"
          type="text"
          value={values.nombre}
          onChange={(e) => setFieldValue('nombre', e.target.value)}
          placeholder="Tu nombre y apellido"
          className={`form-control ${styles.input}`}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.legend}>
          Correo electrónico *
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => setFieldValue('email', e.target.value)}
          placeholder="ejemplo@correo.com"
          className={`form-control ${styles.input}`}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="telefono" className={styles.legend}>
          Teléfono
        </label>
        <input
          id="telefono"
          type="tel"
          value={values.telefono}
          onChange={(e) => setFieldValue('telefono', e.target.value)}
          placeholder="Tu número de teléfono"
          className={`form-control ${styles.input}`}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="ciudad" className={styles.legend}>
          Ciudad
        </label>
        <input
          id="ciudad"
          type="text"
          value={values.ciudad}
          onChange={(e) => setFieldValue('ciudad', e.target.value)}
          placeholder="Tu ciudad"
          className={`form-control ${styles.input}`}
        />
      </div>
    </div>
  );
}