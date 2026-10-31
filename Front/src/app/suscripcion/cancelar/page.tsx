import type { Metadata } from 'next';
import { CancelarSuscripcion } from '../_components/CancelarSuscripcion';

export const metadata: Metadata = {
  title: 'Cancelar suscripción | InkManager',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function CancelarSuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <CancelarSuscripcion token={token ?? ''} />;
}
