import { Suspense } from 'react';
import { StudioClients } from '../_components/StudioSharedViews';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioClients />
    </Suspense>
  );
}
