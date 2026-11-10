import CheckoutForm from './_components/CheckoutForm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const value = params.plan;
  const plan = Array.isArray(value) ? value[0] : value;
  const cycleValue = params.cycle;
  const cycle = Array.isArray(cycleValue) ? cycleValue[0] : cycleValue;

  return <CheckoutForm planId={plan ?? ''} cycleId={cycle ?? ''} />;
}
