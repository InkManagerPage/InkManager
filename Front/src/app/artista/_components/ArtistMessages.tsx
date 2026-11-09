'use client';
import { BandejaMensajes } from '@/components/panel/BandejaMensajes';
import { useArtistPanel } from './ArtistPanelProvider';
export function ArtistMessages() {
  const { recargarOperacion } = useArtistPanel();
  return (
    <BandejaMensajes configuracion="/artista/configuracion" actualizarResumen={recargarOperacion} />
  );
}
