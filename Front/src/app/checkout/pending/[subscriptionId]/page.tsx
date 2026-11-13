import SubscriptionResult from '../../_components/SubscriptionResult';

type Params = Promise<{ subscriptionId: string }>;

export default async function PendingSubscriptionPage({ params }: { params: Params }) {
  const { subscriptionId } = await params;
  return <SubscriptionResult subscriptionId={subscriptionId} />;
}
