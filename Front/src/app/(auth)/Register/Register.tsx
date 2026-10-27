'use client';
import { useState } from 'react';
import { Form, Formik } from 'formik';
import Modal from 'react-bootstrap/Modal';
import { AuthField } from '@/components/forms/AuthField';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { registrarUsuario } from '@/services/users.service';
import { useAuth } from '@/store/AuthProvider';
import { requisitosPassword, validarRegistro } from '@/lib/auth-validation';
import { crearValoresRegistro } from '@/lib/registro';
import type {
  PublicoRegistro,
  RegisterModalProps,
  RegisterValues,
  PerfilRegistroGoogle,
} from '@/types/forms';
import styles from '@/components/auth/auth.module.css';
import { iniciarRegistroGoogle } from '@/services/auth.service';

const rolesProfesionales = [
  { value: 'ARTISTA', title: 'Artista', description: 'Trabajo por mi cuenta.' },
  { value: 'ESTUDIO_ADMIN', title: 'Estudio', description: 'Gestiono un equipo.' },
] as const;
export function RegisterModal({ show, onHide, onSwitch, contexto }: RegisterModalProps) {
  const [publico, setPublico] = useState<PublicoRegistro | null>(
    contexto === 'general' ? null : contexto,
  );
  const [error, setError] = useState('');
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const [conectandoGoogle, setConectandoGoogle] = useState(false);
  const { login } = useAuth();
  async function submit(values: RegisterValues) {
    setError('');
    try {
      await registrarUsuario({ ...values, rol: publico === 'cliente' ? 'CLIENTE' : values.rol });
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

  async function registroConGoogle(values: RegisterValues) {
    setError('');

    const errores = validarRegistro(values);
    let perfil: PerfilRegistroGoogle = { rol: 'CLIENTE' };

    if (publico === 'profesional' && values.rol === 'ARTISTA') {
      if (errores.nombreArtistico) {
        setError(errores.nombreArtistico);
        return;
      }

      perfil = {
        rol: 'ARTISTA',
        nombreArtistico: values.nombreArtistico.trim(),
      };
    } else if (publico === 'profesional' && values.rol === 'ESTUDIO_ADMIN') {
      if (errores.nombreEstudio) {
        setError(errores.nombreEstudio);
        return;
      }

      perfil = {
        rol: 'ESTUDIO_ADMIN',
        nombreEstudio: values.nombreEstudio.trim(),
      };
    }

    setConectandoGoogle(true);

    try {
      await iniciarRegistroGoogle(perfil);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No pudimos iniciar el registro con Google.',
      );
    } finally {
      setConectandoGoogle(false);
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
            {publico === 'cliente'
              ? 'Tu próxima historia.'
              : publico === 'profesional'
                ? 'Tu espacio de trabajo.'
                : 'Creá tu cuenta.'}
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
        ) : !publico ? (
          <>
            <p className={styles.intro}>¿Qué te trae a InkManager?</p>
            <div className={styles.publicos}>
              <button
                type="button"
                className={styles.publico}
                onClick={() => setPublico('cliente')}
              >
                <strong>Quiero tatuarme</strong>
                <small>Creá tu cuenta de cliente.</small>
              </button>
              <button
                type="button"
                className={styles.publico}
                onClick={() => setPublico('profesional')}
              >
                <strong>Soy artista o tengo un estudio</strong>
                <small>Creá una cuenta para tu trabajo.</small>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.intro}>
              {publico === 'cliente'
                ? 'Creá tu cuenta de cliente y empezá a dar forma a tu próximo tatuaje.'
                : '¿Trabajás por tu cuenta o gestionás un estudio?'}
            </p>
            <Formik
              initialValues={crearValoresRegistro(publico)}
              validate={validarRegistro}
              onSubmit={submit}
            >
              {({ values, isSubmitting, handleChange }) => (
                <Form noValidate>
                  <fieldset disabled={isSubmitting || conectandoGoogle}>
                    <legend className={publico === 'cliente' ? 'visually-hidden' : styles.legend}>
                      {publico === 'cliente' ? 'Cuenta de cliente' : 'Tu forma de trabajar'}
                    </legend>
                    {publico === 'profesional' && (
                      <div className={styles.roles}>
                        {rolesProfesionales.map((role) => (
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
                    )}
                    <AuthField
                      prefix="register"
                      name="nombre"
                      label="Tu nombre"
                      autoComplete="name"
                      minLength={2}
                      maxLength={20}
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
                      hint={requisitosPassword}
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
                    <p className={styles.hint}>
                      {publico === 'profesional'
                        ? 'Para Google, completá solamente el nombre artístico o del estudio.'
                        : 'Con Google usaremos el nombre y el email de tu cuenta.'}
                    </p>
                    <GoogleButton
                      onClick={() => registroConGoogle(values)}
                      loading={conectandoGoogle}
                    >
                      Registrarme con Google
                    </GoogleButton>
                  </fieldset>
                </Form>
              )}
            </Formik>
          </>
        )}
        {!cuentaCreada && (
          <p className={styles.switch}>
            ¿Ya tenés cuenta?{' '}
            <button type="button" onClick={onSwitch}>
              Iniciar sesión
            </button>
          </p>
        )}
      </Modal.Body>
    </Modal>
  );
}
