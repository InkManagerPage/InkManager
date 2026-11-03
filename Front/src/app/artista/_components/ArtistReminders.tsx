'use client';
import { PanelReminders } from '@/components/panel/PanelReminders';
import { useArtistPanel } from './ArtistPanelProvider';
import { useArtistProfile } from './ArtistProfileProvider';
export function ArtistReminders() {
  const { perfil } = useArtistProfile();
  return <PanelReminders {...useArtistPanel()} nombre={perfil?.nombreArtistico || 'Tu artista'} />;
}
