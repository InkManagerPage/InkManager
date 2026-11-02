import { Suspense } from 'react';
import { ArtistMessages } from '../_components/ArtistMessages';

export default function MensajesPage() {
  return (
    <Suspense fallback={<p role="status">Cargando mensajes…</p>}>
      <ArtistMessages />
    </Suspense>
  );
}
