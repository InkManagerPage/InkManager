'use client';

import Image from 'next/image';
import styles from './GoogleButton.module.css';

interface GoogleButtonProps {
  children: string;
  onClick: () => void;
  loading?: boolean;
}

export function GoogleButton({ children, onClick, loading = false }: GoogleButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      <Image src="/icons/google-g.png" width={20} height={20} alt="" unoptimized />
      <span>{loading ? 'Conectando…' : children}</span>
    </button>
  );
}
