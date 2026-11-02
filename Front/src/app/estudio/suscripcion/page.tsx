import { Suspense } from 'react';
import { StudioSubscription } from '../_components/StudioSharedViews';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioSubscription />
    </Suspense>
  );
}
