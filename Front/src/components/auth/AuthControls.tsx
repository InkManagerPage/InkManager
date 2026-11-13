'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { LoginModal } from '@/app/(auth)/Login/Login';
import { RegisterModal } from '@/app/(auth)/Register/Register';
import { useAuth } from '@/store/AuthProvider';
import styles from './auth.module.css';
import type { ContextoRegistro } from '@/types/forms';
const nombresRol = {
  CLIENTE: 'Cliente',
  ARTISTA: 'Artista',
  ESTUDIO_ADMIN: 'Estudio',
  SUPERADMIN: 'Administración',
};
export function AuthControls({
  light = false,
  onOpen,
  contextoRegistro = 'general',
}: {
  light?: boolean;
  onOpen?: () => void;
  contextoRegistro?: ContextoRegistro;
}) {
  const { usuario, cargando, error, reintentar, logout, eliminarCuenta } = useAuth();
  const [modal, setModal] = useState<'login' | 'register' | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState('');
  function abrir(value: 'login' | 'register') {
    setModal(value);
    onOpen?.();
  }
  async function salir() {
    setSaliendo(true);
    setErrorSalida('');
    try {
      await logout();
    } catch (cause) {
      setErrorSalida(cause instanceof Error ? cause.message : 'No pudimos cerrar la sesión.');
    } finally {
      setSaliendo(false);
    }
  }
  return (
    <div className={`${styles.controls} ${light ? styles.light : ''}`}>
      {cargando ? (
        <span role="status">Consultando sesión…</span>
      ) : error ? (
        <div role="alert" className={styles.sessionError}>
          <span>{error}</span>
          <button onClick={reintentar}>Reintentar</button>
        </div>
      ) : usuario ? (
        <>
          <span className={styles.user}>
            <strong>{usuario.nombre || usuario.email}</strong>
            <small>{nombresRol[usuario.rol]}</small>
          </span>
          {usuario.rol !== 'CLIENTE' && (
            <Link
              href={
                usuario.rol === 'SUPERADMIN'
                  ? '/admin'
                  : usuario.rol === 'ARTISTA'
                    ? '/artista'
                    : '/estudio'
              }
              className={styles.linkButton}
              onClick={onOpen}
            >
              Mi panel
            </Link>
          )}
          {usuario.rol === 'CLIENTE' && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setErrorEliminacion('');
                setMostrarModalBaja(true);
              }}
              style={{ color: '#dc2626', fontSize: '13px' }}
            >
              Eliminar cuenta
            </button>
          )}
          <button className={styles.outline} onClick={salir} disabled={saliendo}>
            {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
          {errorSalida && (
            <span role="alert" className={styles.sessionError}>
              {errorSalida}
            </span>
          )}
        </>
      ) : (
        <>
          <button className={styles.linkButton} onClick={() => abrir('login')}>
            Iniciar sesión
          </button>
          <button className={styles.outline} onClick={() => abrir('register')}>
            Crear cuenta
          </button>
        </>
      )}
      {modal === 'login' && (
        <LoginModal show onHide={() => setModal(null)} onSwitch={() => setModal('register')} />
      )}
      {modal === 'register' && (
        <RegisterModal
          show
          contexto={contextoRegistro}
          onHide={() => setModal(null)}
          onSwitch={() => setModal('login')}
        />
      )}
      {mostrarModalBaja && (
        <Modal
          show
          onHide={() => !eliminando && setMostrarModalBaja(false)}
          centered
          backdrop={eliminando ? 'static' : true}
        >
          <Modal.Header closeButton={!eliminando}>
            <Modal.Title as="h3" style={{ fontSize: '18px', fontWeight: 600, color: '#111' }}>
              ¿Eliminar tu cuenta de cliente?
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
            <p>
              Esta acción es <strong>permanente e irreversible</strong>. Tu sesión se cerrará y no
              podrás volver a iniciar sesión con estas credenciales.
            </p>
            <p style={{ margin: 0 }}>
              Tus datos personales de acceso serán anonimizados de acuerdo a nuestras políticas de
              privacidad, conservando únicamente los registros numéricos y de citas para fines de
              auditoría interna del estudio.
            </p>
            {errorEliminacion && (
              <p role="alert" style={{ marginTop: '12px', color: '#b91c1c', fontWeight: 500 }}>
                {errorEliminacion}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className={styles.outline}
              onClick={() => setMostrarModalBaja(false)}
              disabled={eliminando}
              style={{ padding: '8px 14px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                setEliminando(true);
                setErrorEliminacion('');
                try {
                  await eliminarCuenta();
                } catch (cause) {
                  setErrorEliminacion(
                    cause instanceof Error
                      ? cause.message
                      : 'No pudimos eliminar tu cuenta. Intentá nuevamente.',
                  );
                  setEliminando(false);
                }
              }}
              disabled={eliminando}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: '#fff',
                border: '1px solid #b91c1c',
                borderRadius: '4px',
                fontWeight: 500,
                cursor: eliminando ? 'wait' : 'pointer',
              }}
            >
              {eliminando ? 'Eliminando…' : 'Sí, eliminar cuenta'}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
