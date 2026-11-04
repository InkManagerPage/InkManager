import Link from 'next/link';
import styles from './success.module.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const paymentId = firstValue(params.payment_id) ?? firstValue(params.collection_id);
  const status = firstValue(params.status) ?? firstValue(params.collection_status);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="payment-title">
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="m14 24 7 7 14-15" />
          </svg>
        </div>
        <p className={styles.eyebrow}>Mercado Pago</p>
        <h1 id="payment-title">¡Pago aprobado!</h1>
        <p className={styles.description}>
          Tu suscripción se completó con éxito. Ya podés empezar a disfrutar de tu plan.
        </p>

        {(paymentId || status) && (
          <dl className={styles.details} aria-label="Detalles de la transacción">
            {paymentId && (
              <div className={styles.detail}>
                <dt>ID de pago</dt>
                <dd>{paymentId}</dd>
              </div>
            )}
            {status && (
              <div className={styles.detail}>
                <dt>Estado</dt>
                <dd>{status}</dd>
              </div>
            )}
          </dl>
        )}

        <Link className={styles.button} href="/">
          Volver al inicio <span aria-hidden="true">→</span>
        </Link>
        <p className={styles.note}>Gracias por confiar en InkManager.</p>
      </section>
    </main>
  );
}
