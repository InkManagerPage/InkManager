import { Suspense } from 'react';
import { StudioProfile } from '../_components/StudioSettings';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioProfile />
    </Suspense>
  );
}
