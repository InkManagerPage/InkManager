'use client';
import { AgendaWorkspace } from '@/components/panel/AgendaWorkspace';
import { useArtistPanel } from './ArtistPanelProvider';
export function ArtistAgenda() {
  return <AgendaWorkspace recordatorios={useArtistPanel().datos.recordatorios} />;
}
