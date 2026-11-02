import { Suspense } from 'react';
import { StudioAgenda } from '../_components/StudioAgenda';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioAgenda />
    </Suspense>
  );
}
