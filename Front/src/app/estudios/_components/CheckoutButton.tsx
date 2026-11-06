import Link from 'next/link';
import type { Plan } from '@/types/plan';
import styles from './landing.module.css';

export default function CheckoutButton({ plan }: { plan: Plan }) {
  const codigo = plan.name === 'Individual' ? 'INDIVIDUAL' : 'ESTUDIO';
  return (
    <Link href={`/suscripcion?plan=${codigo}`} className={`btn btn-outline-dark ${styles.planButton}`}>
      Elegir plan {plan.name} <span aria-hidden="true">↗</span>
    </Link>
  );
}
