import type { Metadata } from 'next';
import { AccountCard } from '@/components/auth/AccountCard';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Nueva contraseña | InkManager',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function RestablecerContrasenaPage() {
  return (
    <AccountCard title="Tu nueva contraseña.">
      <ResetPasswordForm />
    </AccountCard>
  );
}
