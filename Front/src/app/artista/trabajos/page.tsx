import { WorkGallery } from '../_components/WorkGallery';
import { Suspense } from 'react';
export default function MisTrabajosPage() {
  return (
    <Suspense fallback={<p role="status">Cargando trabajos…</p>}>
      <WorkGallery />
    </Suspense>
  );
}
