'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MOCK_ARTISTS } from '@/mocks/artist';
import styles from './combinableFilters.module.css';

type FilterName = 'stylesParam' | 'isStudioParam' | 'locationParam';

const stylesArray = Array.from(new Set(MOCK_ARTISTS.flatMap((artist) => artist.styles)));
const cityArray = Array.from(new Set(MOCK_ARTISTS.map((artist) => artist.city)));

export default function CombinableFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(name: FilterName, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <section className={styles.filters} aria-label="Filtros de búsqueda">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="style-filter">
          Estilo
        </label>
        <select
          className={styles.select}
          id="style-filter"
          defaultValue={searchParams.get('stylesParam') ?? ''}
          onChange={(event) => setFilter('stylesParam', event.target.value)}
        >
          <option value="">Todos</option>
          {stylesArray.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="studio-filter">
          Tipo de artista
        </label>
        <select
          className={styles.select}
          id="studio-filter"
          defaultValue={searchParams.get('isStudioParam') ?? ''}
          onChange={(event) => setFilter('isStudioParam', event.target.value)}
        >
          <option value="">Todos</option>
          <option value="studios">Estudios</option>
          <option value="indie">Artistas Independientes</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="location-filter">
          Ubicación
        </label>
        <select
          className={styles.select}
          id="location-filter"
          defaultValue={searchParams.get('locationParam') ?? ''}
          onChange={(event) => setFilter('locationParam', event.target.value)}
        >
          <option value="">Todos</option>
          {cityArray.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}