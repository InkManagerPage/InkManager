import SubscriptionResult from '../_components/SubscriptionResult';

type SearchParams = Promise<{ subscription_id?: string | string[] }>;

export default async function PendingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const value = params.subscription_id;
  const subscriptionId = Array.isArray(value) ? value[0] : value;
  return <SubscriptionResult subscriptionId={subscriptionId ?? ''} />;
}
