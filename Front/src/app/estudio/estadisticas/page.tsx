import { Suspense } from 'react';
import { StudioStatistics } from '../_components/StudioStatistics';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioStatistics />
    </Suspense>
  );
}
