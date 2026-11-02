'use client';
import { PanelMessages } from '@/components/panel/PanelMessages';
import { useArtistPanel } from './ArtistPanelProvider';
export function ArtistMessages() {
  return <PanelMessages {...useArtistPanel()} />;
}
