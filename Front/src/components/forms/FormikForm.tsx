'use client';
import { Form, Formik } from 'formik';
import { AuthField } from './AuthField';
import { validarLogin } from '@/lib/auth-validation';
import type { LoginValues } from '@/types/forms';
import styles from '@/components/auth/auth.module.css';
export function FormikForm({
  onSubmit,
  error,
}: {
  onSubmit: (values: LoginValues) => Promise<void>;
  error: string;
}) {
  return (
    <Formik<LoginValues>
      initialValues={{ email: '', password: '' }}
      validate={validarLogin}
      onSubmit={onSubmit}
    >
      {({ isSubmitting }) => (
        <Form noValidate>
          <fieldset disabled={isSubmitting}>
            <AuthField
              prefix="login"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <AuthField
              prefix="login"
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </fieldset>
        </Form>
      )}
    </Formik>
  );
}
