import { redirect } from 'next/navigation';
import SubscriptionResult from '../_components/SubscriptionResult';

type SearchParams = Promise<{ subscription_id?: string | string[] }>;

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const value = params.subscription_id;
  const subscriptionId = Array.isArray(value) ? value[0] : value;
  if (!subscriptionId) redirect('/suscripcion/resultado');
  return <SubscriptionResult subscriptionId={subscriptionId ?? ''} />;
}
