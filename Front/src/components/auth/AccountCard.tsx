import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './auth.module.css';

export function AccountCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.accountPage}>
      <section className={styles.accountCard} aria-labelledby="account-title">
        <Link href="/" className={styles.brand}>
          InkManager
        </Link>
        <h1 id="account-title">{title}</h1>
        {children}
        <p className={styles.switch}>
          <Link href="/">Volver al inicio</Link>
        </p>
      </section>
    </main>
  );
}
