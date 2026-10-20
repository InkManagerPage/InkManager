import styles from './landing.module.css';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container-fluid ${styles.container}`}>
        <div className="d-flex flex-column flex-sm-row flex-wrap align-items-start align-items-sm-center justify-content-between gap-3">
          <a className={styles.brand} href="#inicio">
            InkManager
          </a>
          <a className={styles.textLink} href="#inicio">
            Volver arriba <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
