import { ArtistNotifications } from '../_components/ArtistNotifications';
import { Suspense } from 'react';

export default function NotificacionesPage() {
  return (
    <Suspense fallback={<p role="status">Cargando notificaciones…</p>}>
      <ArtistNotifications />
    </Suspense>
  );
}
