'use client';

import { useState } from 'react';
import { Form, Formik } from 'formik';
import { AuthField } from './AuthField';
import { solicitarCorreoCuenta } from '@/services/auth.service';
import styles from '@/components/auth/auth.module.css';

export function RequestEmailForm({ verificar = false }: { verificar?: boolean }) {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <p className={styles.intro}>
        {verificar
          ? 'Te enviaremos un enlace para confirmar tu email.'
          : 'Ingresá tu email para recuperar tu contraseña. Si usás Google, también podés crear una contraseña para ingresar por email.'}
      </p>
      {mensaje ? (
        <p role="status" className={styles.success}>
          {mensaje}
        </p>
      ) : (
        <Formik
          initialValues={{ email: '' }}
          validate={({ email }) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254
              ? {}
              : { email: 'Ingresá un email válido.' }
          }
          onSubmit={async ({ email }) => {
            setError('');
            try {
              setMensaje(await solicitarCorreoCuenta(email, verificar));
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : 'No pudimos procesar tu solicitud.',
              );
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form noValidate>
              <fieldset disabled={isSubmitting}>
                <AuthField
                  name="email"
                  prefix="request-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                />
                {error && (
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                )}
                <button type="submit" className={styles.submit}>
                  {isSubmitting ? 'Procesando…' : 'Enviar enlace'}
                </button>
              </fieldset>
            </Form>
          )}
        </Formik>
      )}
    </>
  );
}
