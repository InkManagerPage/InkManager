import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/auth/SiteHeader';
import styles from './home.module.css';
export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main className={styles.home}>
        <section className={styles.column} aria-labelledby="home-clientes">
          <Image
            src="https://images.pexels.com/photos/32225203/pexels-photo-32225203/free-photo-of-sesion-de-tatuaje-detallada-capturada-en-bogota.jpeg?cs=tinysrgb&dpr=1&w=500"
            alt="Artista trabajando en un tatuaje"
            fill
            className={styles.image}
            loading="eager"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <p>Una idea que se vuelve parte de vos.</p>
            <h1 id="home-clientes">
              Tu próximo tatuaje
              <br />
              empieza acá.
            </h1>
            <Link href="/clientes" className={styles.button}>
              Quiero tatuarme <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section className={styles.column} aria-labelledby="home-artistas">
          <Image
            src="https://img.freepik.com/foto-gratis/vista-lateral-hombre-tatuando-cliente_23-2149525995.jpg"
            alt="Tatuador en su estudio"
            fill
            className={styles.image}
            loading="eager"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <p>Más tiempo para lo que hacés mejor.</p>
            <h2 id="home-artistas">
              Tu arte.
              <br />
              Tu manera de trabajar.
            </h2>
            <Link href="/estudios" className={styles.button}>
              Soy artista o estudio <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
