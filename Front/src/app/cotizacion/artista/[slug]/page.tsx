import { notFound } from 'next/navigation';
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
  const artista: { nombre: string; estudio: string | null } = await respuesta.json();

  return (
    <MarcoCotizacion
      destinatario={artista.estudio || artista.nombre}
      artista={artista.estudio ? artista.nombre : undefined}
    >
      <SolicitudPublica key={id} destino={{ artista: id }} />
    </MarcoCotizacion>
  );
}
