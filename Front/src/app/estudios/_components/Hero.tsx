import Image from 'next/image';
import styles from './landing.module.css';

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Image
        src="/images/studio-session.jpg"
        alt="Artistas trabajando en un estudio de tatuajes"
        fill
        preload
        sizes="100vw"
        className={styles.heroImage}
      />
      <div className={styles.heroShade} />
      <div className={`container-fluid ${styles.container} ${styles.heroContent}`}>
        <h1 id="hero-title">
          MENOS GESTIÓN.
          <br />
          MÁS TATUAJE.
        </h1>
      </div>
    </section>
  );
}
