'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { FormikForm } from '@/components/forms/FormikForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useAuth } from '@/store/AuthProvider';
import type { AuthModalProps, LoginValues } from '@/types/forms';
import styles from '@/components/auth/auth.module.css';
import { iniciarLoginGoogle } from '@/services/auth.service';

export function LoginModal({ show, onHide, onSwitch }: AuthModalProps) {
  const [error, setError] = useState('');
  const { login } = useAuth();
  async function submit(values: LoginValues) {
    setError('');
    try {
      await login(values.email.trim(), values.password);
      onHide();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar sesión.');
    }
  }
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      contentClassName={styles.modal}
      aria-labelledby="login-title"
    >
      <Modal.Header closeButton closeLabel="Cerrar" className={styles.modalHeader}>
        <div>
          <p className={styles.eyebrow}>Tu espacio en InkManager</p>
          <Modal.Title id="login-title" as="h2">
            Qué bueno verte.
          </Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        <p className={styles.intro}>Ingresá para seguir con tu próximo proyecto.</p>
        <FormikForm onSubmit={submit} error={error} />
        <Link href="/recuperar-contrasena" className={styles.recoveryLink} onClick={onHide}>
          ¿Olvidaste tu contraseña?
        </Link>
        <GoogleButton onClick={iniciarLoginGoogle}>Continuar con Google</GoogleButton>
        <p className={styles.switch}>
          ¿Todavía no tenés cuenta?{' '}
          <button type="button" onClick={onSwitch}>
            Crear cuenta
          </button>
        </p>
      </Modal.Body>
    </Modal>
  );
}
