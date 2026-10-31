import Link from 'next/link';
import styles from './failure.module.css';

export default function FailurePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="payment-title">
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M16 16l16 16M32 16 16 32" />
            <circle cx="24" cy="24" r="17" />
          </svg>
        </div>
        <p className={styles.eyebrow}>Mercado Pago</p>
        <h1 id="payment-title">No pudimos procesar tu pago</h1>
        <p className={styles.description}>
          La transacción fue rechazada o no se pudo completar. No te preocupes, podés intentarlo
          nuevamente.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/estudios#planes">
            Intentar de nuevo <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.secondaryButton} href="/">
            Volver al inicio
          </Link>
        </div>
        <p className={styles.note}>Si el problema continúa, probá con otro medio de pago.</p>
      </section>
    </main>
  );
}
