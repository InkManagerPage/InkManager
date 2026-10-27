'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Form, Formik } from 'formik';
import { AuthField } from './AuthField';
import { restablecerContrasena } from '@/services/auth.service';
import { useAuth } from '@/store/AuthProvider';
import { requisitosPassword, validarNuevaPassword } from '@/lib/auth-validation';
import styles from '@/components/auth/auth.module.css';

export function ResetPasswordForm() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const { reintentar } = useAuth();
  if (listo)
    return (
      <p role="status" className={styles.success}>
        Tu contraseña ya está guardada. Cerramos las sesiones anteriores. Volvé al inicio para
        ingresar con tu nueva contraseña.
      </p>
    );
  return (
    <>
      <p className={styles.intro}>{requisitosPassword}</p>
      <Formik
        initialValues={{ password: '', confirmPassword: '' }}
        validate={validarNuevaPassword}
        onSubmit={async ({ password, confirmPassword }, { resetForm }) => {
          setError('');
          try {
            await restablecerContrasena(window.location.hash.slice(1), password, confirmPassword);
            window.history.replaceState(null, '', window.location.pathname);
            resetForm();
            reintentar();
            setListo(true);
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : 'No pudimos actualizar la contraseña.',
            );
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form noValidate>
            <fieldset disabled={isSubmitting}>
              <AuthField
                prefix="reset"
                name="password"
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
              />
              <AuthField
                prefix="reset"
                name="confirmPassword"
                label="Repetí la nueva contraseña"
                type="password"
                autoComplete="new-password"
              />
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button type="submit" className={styles.submit}>
                {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </fieldset>
          </Form>
        )}
      </Formik>
      <Link href="/recuperar-contrasena" className={styles.recoveryLink}>
        Pedir un nuevo enlace
      </Link>
    </>
  );
}
