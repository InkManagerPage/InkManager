import { Field } from 'formik';
import styles from '@/components/auth/auth.module.css';

export function StepContacto() {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="nombre" className={styles.legend}>
          Nombre completo
        </label>
        <Field
          id="nombre"
          name="nombre"
          autoComplete="name"
          className={styles.input}
          maxLength={80}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="email" className={styles.legend}>
          Correo electrónico
        </label>
        <Field
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={styles.input}
          maxLength={254}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="telefono" className={styles.legend}>
          Teléfono con código de país
        </label>
        <Field
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="+54 9 11 1234 5678"
          required
          className={styles.input}
          maxLength={30}
        />
      </div>
      <label className="d-flex gap-2 align-items-start">
        <Field name="promociones" type="checkbox" className="form-check-input" />
        Quiero recibir novedades y promociones por email (opcional).
      </label>
    </>
  );
}
