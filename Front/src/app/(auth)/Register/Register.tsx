'use client';
import { useState } from 'react';
import { Form, Formik } from 'formik';
import Modal from 'react-bootstrap/Modal';
import { AuthField } from '@/components/forms/AuthField';
import { registrarUsuario } from '@/services/users.service';
import { useAuth } from '@/store/AuthProvider';
import { validarRegistro } from '@/lib/auth-validation';
import type { AuthModalProps, RegisterValues } from '@/types/forms';
import styles from '@/components/auth/auth.module.css';
const initialValues: RegisterValues = {
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  rol: 'CLIENTE',
  nombreArtistico: '',
  nombreEstudio: '',
};
const roles = [
  { value: 'CLIENTE', title: 'Cliente', description: 'Quiero tatuarme.' },
  { value: 'ARTISTA', title: 'Artista', description: 'Trabajo por mi cuenta.' },
  { value: 'ESTUDIO_ADMIN', title: 'Estudio', description: 'Gestiono un equipo.' },
] as const;
export function RegisterModal({ show, onHide, onSwitch }: AuthModalProps) {
  const [error, setError] = useState('');
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const { login } = useAuth();
  async function submit(values: RegisterValues) {
    setError('');
    try {
      await registrarUsuario(values);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos crear la cuenta.');
      return;
    }
    try {
      await login(values.email.trim(), values.password);
      onHide();
    } catch {
      setCuentaCreada(true);
    }
  }
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      contentClassName={styles.modal}
      aria-labelledby="register-title"
    >
      <Modal.Header closeButton closeLabel="Cerrar" className={styles.modalHeader}>
        <div>
          <p className={styles.eyebrow}>Empezá por acá</p>
          <Modal.Title id="register-title" as="h2">
            Tu próxima historia.
          </Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {cuentaCreada ? (
          <div role="status">
            <p>Tu cuenta ya está creada. Iniciá sesión para continuar.</p>
            <button className={styles.submit} onClick={onSwitch}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <p className={styles.intro}>Elegí cómo vas a usar InkManager.</p>
            <Formik initialValues={initialValues} validate={validarRegistro} onSubmit={submit}>
              {({ values, isSubmitting, handleChange }) => (
                <Form noValidate>
                  <fieldset disabled={isSubmitting}>
                    <legend className={styles.legend}>Tipo de cuenta</legend>
                    <div className={styles.roles}>
                      {roles.map((role) => (
                        <label key={role.value} className={styles.role}>
                          <input
                            type="radio"
                            name="rol"
                            value={role.value}
                            checked={values.rol === role.value}
                            onChange={handleChange}
                          />
                          <span>
                            <strong>{role.title}</strong>
                            <small>{role.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <AuthField
                      prefix="register"
                      name="nombre"
                      label="Tu nombre"
                      autoComplete="name"
                    />
                    {values.rol === 'ARTISTA' && (
                      <AuthField
                        prefix="register"
                        name="nombreArtistico"
                        label="Nombre artístico"
                        autoComplete="nickname"
                      />
                    )}
                    {values.rol === 'ESTUDIO_ADMIN' && (
                      <AuthField
                        prefix="register"
                        name="nombreEstudio"
                        label="Nombre del estudio"
                        autoComplete="organization"
                      />
                    )}
                    <AuthField
                      prefix="register"
                      name="email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                    />
                    <AuthField
                      prefix="register"
                      name="password"
                      label="Contraseña"
                      type="password"
                      autoComplete="new-password"
                      hint="Usá una frase de al menos 15 caracteres."
                    />
                    <AuthField
                      prefix="register"
                      name="confirmPassword"
                      label="Repetí tu contraseña"
                      type="password"
                      autoComplete="new-password"
                    />
                    {error && (
                      <p className={styles.error} role="alert">
                        {error}
                      </p>
                    )}
                    <button type="submit" className={styles.submit} disabled={isSubmitting}>
                      {isSubmitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
                    </button>
                  </fieldset>
                </Form>
              )}
            </Formik>
            <p className={styles.switch}>
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={onSwitch}>
                Iniciar sesión
              </button>
            </p>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
