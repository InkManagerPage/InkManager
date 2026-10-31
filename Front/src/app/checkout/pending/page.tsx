import Link from 'next/link';
import styles from './pending.module.css';

export default function PendingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="payment-title">
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="17" />
            <path d="M24 14v11l7 4" />
          </svg>
        </div>
        <p className={styles.eyebrow}>Mercado Pago</p>
        <h1 id="payment-title">Estamos verificando tu pago</h1>
        <p className={styles.description}>
          Tu pago todavía está pendiente de confirmación. Esto puede pasar con pagos en efectivo o
          transferencias que están bajo revisión.
        </p>
        <p className={styles.activation}>
          No tenés que hacer nada más: tu plan se va a activar automáticamente cuando se confirme el
          pago.
        </p>
        <Link className={styles.button} href="/">
          Volver al inicio <span aria-hidden="true">→</span>
        </Link>
        <p className={styles.note}>Te avisaremos cuando tu plan esté listo.</p>
      </section>
    </main>
  );
}
