'use client';
import { WorkspaceDirectory } from '@/components/panel/WorkspaceDirectory';
import { BandejaMensajes } from '@/components/panel/BandejaMensajes';
import { PanelReminders } from '@/components/panel/PanelReminders';
import { SuscripcionReal } from '@/components/panel/SuscripcionReal';
import { NotificacionesPanel } from '@/components/panel/NotificacionesPanel';
import { useStudio } from './StudioProvider';

export function StudioClients() {
  return <WorkspaceDirectory tipo="CLIENTES" />;
}
export function StudioMessages() {
  const { recargarOperacion } = useStudio();
  return (
    <BandejaMensajes configuracion="/estudio/configuracion" actualizarResumen={recargarOperacion} />
  );
}
export function StudioReminders() {
  const panel = useStudio();
  return <PanelReminders {...panel} nombre={panel.datos.perfil.nombre} />;
}
export function StudioSubscription() {
  return <SuscripcionReal plan="ESTUDIO" />;
}
export function StudioNotifications() {
  const panel = useStudio();
  return <NotificacionesPanel avisos={panel.operacion?.notificaciones || []} {...panel} />;
}
