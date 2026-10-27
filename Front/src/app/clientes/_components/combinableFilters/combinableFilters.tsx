'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './combinableFilters.module.css';

type FilterName = 'stylesParam' | 'isStudioParam' | 'locationParam';

export default function CombinableFilters({
  stylesArray,
  cityArray,
}: {
  stylesArray: string[];
  cityArray: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [actualizando, startTransition] = useTransition();

  function setFilter(name: FilterName, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  return (
    <section className={styles.filters} aria-label="Filtros de búsqueda" aria-busy={actualizando}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="style-filter">
          Estilo
        </label>
        <select
          className={styles.select}
          id="style-filter"
          disabled={actualizando}
          value={searchParams.get('stylesParam') ?? ''}
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
          disabled={actualizando}
          value={searchParams.get('isStudioParam') ?? ''}
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
          disabled={actualizando}
          value={searchParams.get('locationParam') ?? ''}
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
