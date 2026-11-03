import { Suspense } from 'react';
import { StudioReminders } from '../_components/StudioSharedViews';
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <StudioReminders />
    </Suspense>
  );
}
