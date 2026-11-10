import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api-client';
import { SolicitudPublica } from '../components/SolicitudPublica';
import { MarcoCotizacion } from '../components/MarcoCotizacion';
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
    <MarcoCotizacion destinatario={estudio.nombre}>
      <SolicitudPublica key={ig ?? slug} destino={{ estudio: slug }} enlaceInstagram={ig} />
    </MarcoCotizacion>
  );
}
