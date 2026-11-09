'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/store/AuthProvider';
import { crearEstadoEstudio } from '@/lib/estado-panel';
import { useConsultas } from '@/hooks/useConsultas';
import { useOperacion } from '@/hooks/useOperacion';
import type { DatosPanelEstudio } from '@/types/panel-estudio';

const inicial = crearEstadoEstudio();
function useStudioState() {
  const { usuario } = useAuth();
  const { datos: fuente } = useConsultas();
  const operacion = useOperacion();
  const perfil = operacion.operacion?.estudio;
  const datos: DatosPanelEstudio = {
    ...inicial,
    perfil: perfil || {
      ...inicial.perfil,
      nombre: fuente?.contexto.nombre || usuario?.nombre || 'Mi estudio',
      email: usuario?.email || '',
    },
    plazoPropuestasHoras: perfil?.plazoPropuestasHoras ?? inicial.plazoPropuestasHoras,
    equipo: fuente?.equipo || [],
    clientes: fuente?.clientes || [],
    consultas: fuente?.consultas || [],
    citas: fuente?.citas || [],
    conversaciones: operacion.operacion?.conversaciones || [],
    recordatorios: operacion.recordatorios,
  };
  function buscarCliente(id: string) {
    return (
      datos.clientes.find((c) => c.id === id) || {
        id,
        nombre: 'Cliente no disponible',
        email: '',
        telefono: '',
        ciudad: '',
        notas: '',
      }
    );
  }
  function nombreArtista(id: string | null) {
    return datos.equipo.find((a) => a.id === id)?.nombre || 'Sin asignar';
  }
  return { ...operacion, datos, buscarCliente, nombreArtista };
}
const Context = createContext<ReturnType<typeof useStudioState> | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const value = useStudioState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStudio() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta StudioProvider.');
  return value;
}
