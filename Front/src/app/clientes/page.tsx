import { MOCK_STUDIOS } from '@/mocks/studiosData';
import { Artist, PortfolioImage, Studio } from '@/types/estudios';
import StudiosList from './_components/studio/StudioList';
import { MOCK_ARTISTS } from '@/mocks/artist';
import ArtistList from './_components/artist/ArtistList';
import styles from './clientes.module.css';
import { MOCK_PORTFOLIO } from "@/mocks/portfolios"
import PortfolioList from './_components/portfolio/PortfolioList';
import CombinableFilters from './_components/combinableFilters/combinableFilters';
import { SiteHeader } from '@/components/auth/SiteHeader';

interface QuieroTatuarmePageProps {
 searchParams: Promise<{
  stylesParam?:string,
  isStudioParam?:string,
  locationParam?:string,
}>
}

const QuieroTatuarmePage = async ({searchParams}: QuieroTatuarmePageProps) => {

  const {stylesParam, isStudioParam, locationParam }= await searchParams;

  let estudios: Studio[] = MOCK_STUDIOS;

  const todosLosArtistas: Artist[] = MOCK_ARTISTS;
  let artistasIndie: Artist[] = todosLosArtistas.filter((a) => a.is_independent === true);

  const todasLasObras: PortfolioImage[] = MOCK_PORTFOLIO;
  let todasLasObrasDestacadas = todasLasObras.filter((imagen)=>imagen.is_featured===true);



  if (stylesParam){
    const artistasDelEstilo= MOCK_ARTISTS.filter((a)=>a.styles.includes(stylesParam))
    const idEstudiosDelEstilo =  Array.from(new Set(artistasDelEstilo.flatMap((a)=>a.primary_studio_id)))
    const estudiosDelEstilo = MOCK_STUDIOS.filter((e)=>idEstudiosDelEstilo.includes(e.id))
      estudios = estudiosDelEstilo

    const artistasIndieDelEstilo = MOCK_ARTISTS.filter((a) => a.is_independent === true && a.styles.includes(stylesParam))
      artistasIndie = artistasIndieDelEstilo

    const obrasDelEstilo = MOCK_PORTFOLIO.filter((imagen)=>imagen.style===stylesParam)
      todasLasObrasDestacadas = obrasDelEstilo
  };


  if(locationParam){

    const estudiosByLocation = estudios.filter((e)=>e.city===locationParam);
    estudios = estudiosByLocation;

    const artistByLocation = artistasIndie.filter((a)=>a.city===locationParam);
     artistasIndie = artistByLocation;

  };




  


  return (
    <main className={styles.page} data-bs-theme="light">
	<SiteHeader contextoRegistro="cliente" />
      {/* --- HERO SECTION --- */}
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Encuentra tu próximo tatuaje</span>

        <h1 className={styles.title}>Quiero tatuarme</h1>

        <p className={styles.intro}>
          Descubre los mejores estudios destacados y artistas independientes cerca de ti para hacer
          realidad tu idea.
        </p>
      </header>

      {/* --- FILTROS ---  */}

      < CombinableFilters />


      {/* --- SECCIONES DE CONTENIDO --- */}
      <div className={styles.content}>
        {/* Sección: Estudios */}

        {(isStudioParam === "studios" || !isStudioParam) && (<>
            <section>
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>Estudios Destacados</h2>
                <p className={styles.sectionDescription}>
                  Espacios de tatuaje profesionales con estilos únicos.
                </p>
              </div>

              {(estudios.length === 0) && (
                <p className={styles.noResultsMessage}>
                  No se encontraron estudios que coincidan con los filtros seleccionados.
                </p>
              )}

              <StudiosList studios={estudios} />
            </section>

             <hr className={styles.divider} />

             </>
        )}
        

        {/* Sección: Artistas Independientes */}

        {(isStudioParam === "indie" || !isStudioParam) && (
        <section>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Artistas Independientes</h2>
            <p className={styles.sectionDescription}>
              Tatuadores independientes especializados en diversos estilos artísticos.
            </p>
          </div>

          {(artistasIndie.length === 0) && (
            <p className={styles.noResultsMessage}>
              No se encontraron artistas independientes que coincidan con los filtros seleccionados.
            </p>
          )}

          <ArtistList artist={artistasIndie} />
        </section>)}

        {/* Sección: Estudios */}
        <section>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>obras destacadas</h2>
            <p className={styles.sectionDescription}>
              Conoce los estilos y obras destacadas de nuestros artistas.
            </p>
          </div>

          < PortfolioList portfolio={todasLasObrasDestacadas} />
        </section>
      </div>
    </main>
  );
};

export default QuieroTatuarmePage;