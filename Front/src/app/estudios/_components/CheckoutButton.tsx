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
        aria-label={`Plan ${plan.name} mensual${plan.precio ? ` por ${plan.precio.mensual} pesos al mes` : ''}`}
      >
        Mensual{plan.precio && ` · $${plan.precio.mensual.toLocaleString('es-AR')} / mes`}
        <span aria-hidden="true">↗</span>
      </Link>
      <Link
        href={`/checkout?plan=${plan.id}&cycle=ANUAL`}
        className={`btn ${styles.planButton} ${styles.planCheckoutButton}`}
        aria-label={`Plan ${plan.name} anual${plan.precio ? ` por ${plan.precio.anual} pesos al año` : ''}`}
      >
        Anual{plan.precio && ` · $${plan.precio.anual.toLocaleString('es-AR')} / año`}
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
