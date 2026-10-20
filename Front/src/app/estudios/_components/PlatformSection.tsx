import Image from 'next/image';
import styles from './landing.module.css';

export function PlatformSection() {
  return (
    <section id="plataforma" className={styles.section} aria-labelledby="platform-title">
      <div className={`container-fluid ${styles.container}`}>
        <div className="row align-items-center gy-5 gx-lg-5">
          <div className="col-lg-6">
            <div className={styles.detailImage}>
              <Image
                src="/images/tattoo-detail.jpg"
                alt="Detalle de una sesión de tatuaje, con el artista trabajando sobre la piel"
                fill
                loading="eager"
                sizes="(max-width: 991px) 90vw, 40vw"
              />
            </div>
          </div>
          <div className={`col-lg-6 ${styles.platformCopy}`}>
            <h2 id="platform-title">Enfocate en tu arte, InkManager se encarga del resto.</h2>
            <p className={styles.bodyCopy}>
              Nosotros te respondemos mensajes, recordamos turnos, organizamos tu agenda y ayudamos
              a cotizar. Todo en un solo lugar.
            </p>
            <p className={styles.bodyCopy}>
              InkManager conecta cada consulta con su presupuesto y su turno. Para que puedas
              retomar una conversación sin volver a preguntar todo.
            </p>
            <a href="#herramientas" className={styles.textLink}>
              Mirá cómo te ayuda <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
