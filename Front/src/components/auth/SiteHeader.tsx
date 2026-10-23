import Link from 'next/link';
import { AuthControls } from './AuthControls';
import styles from './auth.module.css';
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`${styles.siteHeader} ${overlay ? styles.overlayHeader : ''}`}>
      <Link href="/" className={styles.brand} aria-label="InkManager, inicio">
        InkManager
      </Link>
      <AuthControls light={overlay} />
    </header>
  );
}
