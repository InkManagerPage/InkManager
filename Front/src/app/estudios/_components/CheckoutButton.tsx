'use client';
import Link from 'next/link';
import styles from './landing.module.css';
import type { Plan } from '@/types/plan';

interface CheckoutButtonProps {
  plan: Plan;
}

export default function CheckoutButton({ plan }: CheckoutButtonProps) {
  return (
    <div className={styles.planCheckoutOptions}>
      <Link
        href={`/checkout?plan=${plan.id}&cycle=MENSUAL`}
        className={`btn ${styles.planButton} ${styles.planCheckoutButton}`}
        aria-label={`Suscribirte al plan ${plan.name} mensual por ${plan.price} pesos`}
      >
        Mensual · ${plan.price.toLocaleString('es-AR')} / mes <span aria-hidden="true">↗</span>
      </Link>
      <Link
        href={`/checkout?plan=${plan.id}&cycle=ANUAL`}
        className={`btn ${styles.planButton} ${styles.planCheckoutButton}`}
        aria-label={`Suscribirte al plan ${plan.name} anual por ${plan.annualPrice} pesos`}
      >
        Anual · ${plan.annualPrice.toLocaleString('es-AR')} / año
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
