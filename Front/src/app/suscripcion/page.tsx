import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  redirect(`/checkout?plan=${planInicial}&cycle=MENSUAL`);
}
