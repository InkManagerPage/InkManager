import { Suspense } from 'react';
import { StudioQueries } from '../_components/StudioQueries';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioQueries />
    </Suspense>
  );
}
