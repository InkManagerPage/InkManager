import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api-client';
import styles from '@/components/auth/auth.module.css';
import { SolicitudEstudio } from './SolicitudEstudio';

export default async function CotizacionEstudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const respuesta = await apiFetch(`/consultas/publicas/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const estudio: { nombre: string } = await respuesta.json();
  return (
    <main className={styles.accountPage}>
      <div className={styles.accountCard}>
        <Link href="/clientes" className={styles.eyebrow}>
          ← Volver al catálogo
        </Link>
        <h1 className="mt-3">Solicitar presupuesto</h1>
        <p className={styles.intro}>{estudio.nombre}</p>
        <SolicitudEstudio key={slug} slug={slug} />
      </div>
    </main>
  );
}
