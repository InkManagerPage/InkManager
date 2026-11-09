import Image from 'next/image';
import styles from './landing.module.css';

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`container-fluid ${styles.container} ${styles.heroLayout}`}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Una plataforma para estudios y artistas</p>
          <h1 id="hero-title">
            Menos gestión.
            <br />
            <span className={styles.heroAccent}>Más tatuaje.</span>
          </h1>
          <p className={styles.heroDescription}>
            Ordená tus consultas, presupuestos y turnos en un mismo lugar. Vos, con más tiempo para
            crear.
          </p>
          <a href="#plataforma" className={`${styles.textLink} ${styles.heroLink}`}>
            Conocé la plataforma <span aria-hidden="true">↗</span>
          </a>
        </div>
        <figure className={styles.heroVisual}>
          <Image
            src="/images/studio-session.jpg"
            alt="Artistas trabajando en un estudio de tatuajes"
            fill
            preload
            sizes="(max-width: 991px) 100vw, 52vw"
            className={styles.heroImage}
          />
          <figcaption className={styles.heroCaption}>
            <span>01</span> Un espacio para enfocarte en tu arte
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
