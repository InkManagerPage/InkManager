'use client';
import { SuscripcionReal } from '@/components/panel/SuscripcionReal';
import { useAuth } from '@/store/AuthProvider';

export function ArtistSubscription() {
  const { usuario } = useAuth();
  return <SuscripcionReal plan="INDIVIDUAL" puedeContratar={!usuario?.estudioId} />;
}
