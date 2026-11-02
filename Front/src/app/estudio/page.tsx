import { Suspense } from 'react';
import { StudioOverview } from './_components/StudioOverview';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioOverview />
    </Suspense>
  );
}
