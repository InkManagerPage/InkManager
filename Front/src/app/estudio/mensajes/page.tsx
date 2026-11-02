import { Suspense } from 'react';
import { StudioMessages } from '../_components/StudioSharedViews';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioMessages />
    </Suspense>
  );
}
