import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResultadoSuscripcion } from '../_components/ResultadoSuscripcion';

export const metadata: Metadata = {
  title: 'Estado de suscripción | InkManager',
};

export default async function ResultadoSuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ subscription_id?: string | string[] }>;
}) {
  const params = await searchParams;
  const value = params.subscription_id;
  const subscriptionId = Array.isArray(value) ? value[0] : value;
  if (subscriptionId) {
    redirect(`/checkout/pending?subscription_id=${encodeURIComponent(subscriptionId)}`);
  }
  return <ResultadoSuscripcion />;
}
