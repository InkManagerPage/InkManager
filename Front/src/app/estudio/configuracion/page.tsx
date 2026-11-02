import { Suspense } from 'react';
import { StudioSettings } from '../_components/StudioSettings';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioSettings />
    </Suspense>
  );
}
