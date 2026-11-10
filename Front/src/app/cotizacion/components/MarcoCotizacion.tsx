import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './cotizacion.module.css';

export function MarcoCotizacion({
  destinatario,
  children,
}: {
  destinatario: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.pagina}>
      <div className={styles.marco}>
        <header className={styles.cabecera}>
          <Link href="/clientes" className={styles.volver}>
            ← Volver al catálogo
          </Link>
          <h1>Solicitar presupuesto</h1>
          <p className={styles.destino}>
            <span>Consulta para</span>
            <strong>{destinatario}</strong>
          </p>
        </header>
        <div className={styles.contenido}>{children}</div>
      </div>
    </main>
  );
}
