import { Suspense } from 'react';
import { ArtistAgenda } from '../_components/ArtistAgenda';

export default function AgendaPage() {
  return (
    <Suspense fallback={<p role="status">Cargando agenda…</p>}>
      <ArtistAgenda />
    </Suspense>
  );
}
