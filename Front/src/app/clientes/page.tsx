import type { CatalogoPublico } from '@/types/artista';
import { obtenerCatalogo } from '@/services/catalogo.service';
import PortfolioList from './_components/portfolio/PortfolioList';
import CombinableFilters from './_components/combinableFilters/combinableFilters';
import { SiteHeader } from '@/components/auth/SiteHeader';
import styles from './clientes.module.css';

interface Props {
  searchParams: Promise<{
    stylesParam?: string | string[];
    isStudioParam?: string | string[];
    locationParam?: string | string[];
  }>;
}

export default async function QuieroTatuarmePage({ searchParams }: Props) {
  const params = await searchParams;
  const estilo = typeof params.stylesParam === 'string' ? params.stylesParam : '';
  const tipo = typeof params.isStudioParam === 'string' ? params.isStudioParam : '';
  const ciudad = typeof params.locationParam === 'string' ? params.locationParam : '';
  let catalogo: CatalogoPublico = { artistas: [], trabajos: [], estilos: [], ciudades: [] };
  let error = false;
  try {
    catalogo = await obtenerCatalogo();
  } catch {
    error = true;
  }
  const trabajos = catalogo.trabajos.filter(
    (trabajo) =>
      (!estilo || trabajo.estilos.includes(estilo)) &&
      (!ciudad || trabajo.ciudad === ciudad) &&
      (tipo === 'studios'
        ? Boolean(trabajo.estudioId)
        : tipo === 'indie'
          ? !trabajo.estudioId
          : true),
  );

  return (
    <main className={styles.page} data-bs-theme="light">
      <SiteHeader contextoRegistro="cliente" />
      <header className={styles.hero}>
        <h1 className={styles.title}>Encontrá tu próximo tatuaje</h1>
      </header>
      <CombinableFilters stylesArray={catalogo.estilos} cityArray={catalogo.ciudades} />
      <div className={styles.content}>
        {error ? (
          <p className="alert alert-warning" role="alert">
            No pudimos cargar los trabajos. Intentá nuevamente.
          </p>
        ) : trabajos.length ? (
          <PortfolioList trabajos={trabajos} artistas={catalogo.artistas} />
        ) : (
          <p className={styles.noResultsMessage}>No hay trabajos disponibles con estos filtros.</p>
        )}
      </div>
    </main>
  );
}
