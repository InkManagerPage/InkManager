import type { Metadata } from 'next';
import { Checkout } from './_components/Checkout';

export const metadata: Metadata = {
  title: 'Elegí tu plan | InkManager',
};

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const planInicial = plan === 'ESTUDIO' ? 'ESTUDIO' : 'INDIVIDUAL';
  return <Checkout planInicial={planInicial} />;
}
