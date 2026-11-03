'use client';
import { AgendaWorkspace } from '@/components/panel/AgendaWorkspace';
import { useStudio } from './StudioProvider';
export function StudioAgenda() {
  return <AgendaWorkspace recordatorios={useStudio().datos.recordatorios} />;
}
