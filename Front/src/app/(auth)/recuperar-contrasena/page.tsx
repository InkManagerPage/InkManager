import type { Metadata } from 'next';
import { AccountCard } from '@/components/auth/AccountCard';
import { RequestEmailForm } from '@/components/forms/RequestEmailForm';

export const metadata: Metadata = {
  title: 'Recuperar contraseña | InkManager',
  robots: { index: false, follow: false },
};

export default function RecuperarContrasenaPage() {
  return (
    <AccountCard title="Recuperá tu acceso.">
      <RequestEmailForm />
    </AccountCard>
  );
}
