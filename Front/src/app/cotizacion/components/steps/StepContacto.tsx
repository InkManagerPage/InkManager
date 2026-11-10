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
          Teléfono (opcional)
        </label>
        <Field
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          className={styles.input}
          maxLength={30}
        />
      </div>
    </>
  );
}
