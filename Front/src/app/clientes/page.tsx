import { MOCK_STUDIOS } from '@/mocks/studiosData';
import { Artist, Studio } from '@/types/estudios';
import StudiosList from './_components/studio/StudioList';
import { MOCK_ARTISTS } from '@/mocks/artist';
import ArtistList from './_components/artist/ArtistList';
import styles from './clientes.module.css';
import { SiteHeader } from '@/components/auth/SiteHeader';

const estudios: Studio[] = MOCK_STUDIOS;
const todosLosArtistas: Artist[] = MOCK_ARTISTS;
const artistasIndie: Artist[] = todosLosArtistas.filter((a) => a.is_independent === true);

const QuieroTatuarmePage = () => {
  return (
    <main className={styles.page}>
      <SiteHeader />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Encuentra tu próximo tatuaje</span>

        <h1 className={styles.title}>Quiero tatuarme</h1>

        <p className={styles.intro}>
          Descubre los mejores estudios destacados y artistas independientes cerca de ti para hacer
          realidad tu idea.
        </p>
      </header>

      {/* --- SECCIONES DE CONTENIDO --- */}
      <div className={styles.content}>
        {/* Sección: Estudios */}
        <section>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Estudios Destacados</h2>
            <p className={styles.sectionDescription}>
              Espacios de tatuaje profesionales con estilos únicos.
            </p>
          </div>

          <StudiosList studios={estudios} />
        </section>

        <hr className={styles.divider} />

        {/* Sección: Artistas Independientes */}
        <section>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Artistas Independientes</h2>
            <p className={styles.sectionDescription}>
              Tatuadores independientes especializados en diversos estilos artísticos.
            </p>
          </div>

          <ArtistList artist={artistasIndie} />
        </section>
      </div>
    </main>
  );
};

export default QuieroTatuarmePage;
