import type { Metadata } from 'next';
import { AccountCard } from '@/components/auth/AccountCard';
import { VerifyEmail } from '@/components/auth/VerifyEmail';

export const metadata: Metadata = {
  title: 'Verificar email | InkManager',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function VerificarEmailPage() {
  return (
    <AccountCard title="Confirmá tu email.">
      <VerifyEmail />
    </AccountCard>
  );
}
