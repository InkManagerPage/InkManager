import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api-client';
import styles from '@/components/auth/auth.module.css';
import { SolicitudPublica } from '../components/SolicitudPublica';
import type { Metadata } from 'next';

export const metadata: Metadata = { referrer: 'no-referrer' };

export default async function CotizacionEstudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ig?: string | string[] }>;
}) {
  const [{ slug }, { ig }] = await Promise.all([params, searchParams]);
  if (Array.isArray(ig)) notFound();
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
        <SolicitudPublica key={ig ?? slug} destino={{ estudio: slug }} enlaceInstagram={ig} />
      </div>
    </main>
  );
}
