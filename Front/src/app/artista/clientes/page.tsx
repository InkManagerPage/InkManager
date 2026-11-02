import { Suspense } from 'react';
import { ArtistClients } from '../_components/ArtistClients';

export default function ClientesPage() {
  return (
    <Suspense fallback={<p role="status">Cargando clientes…</p>}>
      <ArtistClients />
    </Suspense>
  );
}
