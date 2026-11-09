import { Suspense } from 'react';
import { StudioNotifications } from '../_components/StudioSharedViews';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando notificaciones…</p>}>
      <StudioNotifications />
    </Suspense>
  );
}
