'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from 'react-bootstrap/Alert';
import styles from './auth.module.css';

export function CuentaEliminadaNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const eliminada = params.get('cuenta_eliminada') === 'true';

  if (!eliminada) return null;

  function cerrar() {
    const query = new URLSearchParams(params.toString());
    query.delete('cuenta_eliminada');
    router.replace(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false });
  }

  return (
    <Alert
      variant="success"
      dismissible
      closeLabel="Cerrar aviso"
      onClose={cerrar}
      className={styles.googleNotice}
      style={{
        background: '#f0fdf4',
        borderColor: '#bbf7d0',
        color: '#166534',
        fontWeight: 500,
      }}
    >
      ✓ Tu cuenta ha sido eliminada exitosamente.
    </Alert>
  );
}
