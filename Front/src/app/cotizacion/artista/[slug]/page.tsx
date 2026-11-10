import { notFound, redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api-client';
import { SolicitudPublica } from '../../components/SolicitudPublica';
import { MarcoCotizacion } from '../../components/MarcoCotizacion';

export default async function CotizacionArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: id } = await params;
  const respuesta = await apiFetch(`/consultas/publicas/artista/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  }).catch((error: unknown) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  });
  const artista: { nombre: string; estudioSlug: string | null } = await respuesta.json();
  if (artista.estudioSlug) redirect(`/cotizacion/${encodeURIComponent(artista.estudioSlug)}`);

  return (
    <MarcoCotizacion destinatario={artista.nombre}>
      <SolicitudPublica key={id} destino={{ artista: id }} />
    </MarcoCotizacion>
  );
}
