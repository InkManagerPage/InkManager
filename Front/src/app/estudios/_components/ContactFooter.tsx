import Link from 'next/link';
import styles from './ContactFooter.module.css';

export function ContactFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <span className={styles.brand}>InkManager</span>
        <span className={styles.copyright}>© InkManager</span>
        <nav className={styles.links} aria-label="Enlaces del sitio">
          <Link className={styles.footerLink} href="/clientes">
            Galería de tatuajes
          </Link>
          <Link className={styles.footerLink} href="/estudios#planes">
            Planes para estudios
          </Link>
          <Link className={styles.footerLink} href="/contacto">
            Contact Us
          </Link>
          <Link className={styles.footerLink} href="/terminos-y-condiciones">
            Términos y Condiciones
          </Link>
        </nav>
      </div>
    </footer>
  );
}
