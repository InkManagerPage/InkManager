'use client';
import { WorkspaceDirectory } from '@/components/panel/WorkspaceDirectory';
import { PanelMessages } from '@/components/panel/PanelMessages';
import { PanelReminders } from '@/components/panel/PanelReminders';
import { PanelSubscription } from '@/components/panel/PanelSubscription';
import { useStudio } from './StudioProvider';

export function StudioClients() {
  return <WorkspaceDirectory tipo="CLIENTES" />;
}
export function StudioMessages() {
  return <PanelMessages {...useStudio()} />;
}
export function StudioReminders() {
  const panel = useStudio();
  return <PanelReminders {...panel} nombre={panel.datos.perfil.nombre} />;
}
export function StudioSubscription() {
  const { datos, setDatos } = useStudio();
  return (
    <PanelSubscription
      suscripcion={datos.suscripcion}
      nombrePlan="Estudio"
      precio={(ciclo) => (ciclo === 'ANUAL' ? 290000 : 29000)}
      cambiarCiclo={(ciclo) =>
        setDatos((d) => ({
          ...d,
          suscripcion: {
            ...d.suscripcion,
            cicloProximo: ciclo === d.suscripcion.ciclo ? null : ciclo,
          },
        }))
      }
      cancelarRenovacion={() =>
        setDatos((d) => ({
          ...d,
          suscripcion: { ...d.suscripcion, estado: 'CANCELACION_PROGRAMADA', cicloProximo: null },
        }))
      }
      reactivarRenovacion={() =>
        setDatos((d) => ({ ...d, suscripcion: { ...d.suscripcion, estado: 'ACTIVA' } }))
      }
    />
  );
}
