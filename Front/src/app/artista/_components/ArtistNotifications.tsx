'use client';
import { NotificacionesPanel } from '@/components/panel/NotificacionesPanel';
import { useArtistPanel } from './ArtistPanelProvider';
export function ArtistNotifications() {
  const panel = useArtistPanel();
  return <NotificacionesPanel avisos={panel.datos.notificaciones} {...panel} />;
}
