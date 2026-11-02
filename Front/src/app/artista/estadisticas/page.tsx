import { ArtistStatistics } from '../_components/ArtistStatistics';
import { Suspense } from 'react';

export default function ArtistStatisticsPage() {
  return (
    <Suspense fallback={<p role="status">Cargando estadísticas…</p>}>
      <ArtistStatistics />
    </Suspense>
  );
}
