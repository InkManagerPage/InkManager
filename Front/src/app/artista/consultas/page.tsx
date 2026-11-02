import { Suspense } from 'react';
import { ArtistQueries } from '../_components/ArtistQueries';

export default function ConsultasPage() {
  return (
    <Suspense fallback={<p role="status">Cargando consultas…</p>}>
      <ArtistQueries />
    </Suspense>
  );
}
