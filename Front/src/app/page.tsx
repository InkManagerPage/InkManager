// import { redirect } from 'next/navigation';

// export default function HomePage() {
//   redirect('/estudios');
// }

import Image from 'next/image';
import Link from 'next/link';
import styles from './home.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      {/* Columna Izquierda */}
      <div className={styles.column}>
        <Image
          src="https://images.pexels.com/photos/32225203/pexels-photo-32225203/free-photo-of-sesion-de-tatuaje-detallada-capturada-en-bogota.jpeg?cs=tinysrgb&dpr=1&w=500"
          alt="Quiero tatuarme"
          fill
          className={styles.image}
          priority
        />
        {/* Capa de contraste con oscurecimiento dinámico al hacer hover */}
        <div className={styles.overlay} />

        <Link href="/clientes" className={`${styles.action} ${styles.actionRight}`}>
          <button className={styles.button}>Quiero tatuarme</button>
        </Link>
      </div>

      {/* Columna Derecha */}
      <div className={styles.column}>
        <Image
          src="https://img.freepik.com/foto-gratis/vista-lateral-hombre-tatuando-cliente_23-2149525995.jpg"
          alt="Soy estudio o artista independiente"
          fill
          className={styles.image}
          priority
        />
        {/* Capa de contraste */}
        <div className={styles.overlay} />

        <Link href="/estudios" className={`${styles.action} ${styles.actionLeft}`}>
          <button className={`${styles.button} ${styles.longButton}`}>
            Soy estudio o artista independiente
          </button>
        </Link>
      </div>
    </div>
  );
}
