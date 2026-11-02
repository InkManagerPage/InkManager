import { Suspense } from 'react';
import { StudioTeam } from '../_components/StudioTeam';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioTeam />
    </Suspense>
  );
}
