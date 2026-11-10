import { Field } from 'formik';
import styles from '../cotizacion.module.css';

export function StepContacto() {
  return (
    <div className={styles.campos}>
      <div>
        <label htmlFor="nombre">Nombre completo</label>
        <Field
          id="nombre"
          name="nombre"
          autoComplete="name"
          className={styles.campo}
          maxLength={80}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Correo electrónico</label>
        <Field
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={styles.campo}
          maxLength={254}
          required
        />
      </div>
      <div>
        <label htmlFor="telefono">Teléfono con código de país</label>
        <Field
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="+54 9 11 1234 5678"
          className={styles.campo}
          maxLength={30}
          required
        />
      </div>
      <label className={styles.permiso}>
        <Field name="promociones" type="checkbox" className="form-check-input" />
        Quiero recibir novedades y promociones por email (opcional).
      </label>
    </div>
  );
}
