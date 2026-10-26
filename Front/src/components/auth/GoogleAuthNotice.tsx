'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from 'react-bootstrap/Alert';
import styles from './auth.module.css';

const mensajes = new Map([
  ['cancelado', 'Cancelaste el acceso con Google. Podés volver a intentarlo cuando quieras.'],
  [
    'cuenta',
    'Si ya tenés una cuenta, ingresá con tu método habitual. Si es tu primera vez, elegí Crear cuenta para registrarte con Google.',
  ],
  ['fallido', 'No pudimos completar el acceso con Google. Iniciá el intento nuevamente.'],
]);

export function GoogleAuthNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const mensaje = mensajes.get(params.get('google_error') ?? '');
  if (!mensaje) return null;

  function cerrar() {
    const query = new URLSearchParams(params.toString());
    query.delete('google_error');
    router.replace(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false });
  }

  return (
    <Alert
      variant="light"
      dismissible
      closeLabel="Cerrar aviso"
      onClose={cerrar}
      className={styles.googleNotice}
    >
      {mensaje}
    </Alert>
  );
}
