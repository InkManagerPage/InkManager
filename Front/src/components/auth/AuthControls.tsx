'use client';
import { useState } from 'react';
import Link from 'next/link';
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
  const { usuario, cargando, error, reintentar, logout } = useAuth();
  const [modal, setModal] = useState<'login' | 'register' | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [errorSalida, setErrorSalida] = useState('');
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
          {usuario.rol === 'ARTISTA' && (
            <Link href="/artista/trabajos" className={styles.linkButton} onClick={onOpen}>
              Mi panel
            </Link>
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
    </div>
  );
}
