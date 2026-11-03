'use client';
import { PanelSubscription } from '@/components/panel/PanelSubscription';
import { useArtistPanel } from './ArtistPanelProvider';
import { precioIndividual } from '@/lib/suscripcion-panel';
export function ArtistSubscription() {
  const panel = useArtistPanel();
  return (
    <PanelSubscription
      {...panel}
      suscripcion={panel.datos.suscripcion}
      nombrePlan="Individual"
      precio={precioIndividual}
    />
  );
}
