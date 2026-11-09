'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useConsultas } from '@/hooks/useConsultas';
import { useOperacion } from '@/hooks/useOperacion';
import { crearEstadoArtista, consultaParaResumen } from '@/lib/estado-panel';
import type { ClientePanel, DatosPanelArtista } from '@/types/panel-artista';

const inicial = crearEstadoArtista();
function useEstadoArtista() {
  const { datos: fuente } = useConsultas();
  const operacion = useOperacion();
  const datos: DatosPanelArtista = {
    ...inicial,
    clientes: fuente?.clientes || [],
    citas: fuente?.citas || [],
    consultas: (fuente?.consultas || []).map((c) =>
      consultaParaResumen(c, fuente!.contexto.usuarioId),
    ),
    estudio:
      fuente?.contexto.tipo === 'ESTUDIO'
        ? {
            nombre: fuente.contexto.nombre,
            ciudad: '',
            direccion: '',
            email: '',
            integrantes: fuente.equipo
              .filter((a) => a.id !== fuente.contexto.usuarioId)
              .map((a) => ({ nombre: a.nombre, especialidad: a.estilos, rol: 'Artista' })),
          }
        : null,
    conversaciones: operacion.operacion?.conversaciones || [],
    notificaciones: operacion.operacion?.notificaciones || [],
    recordatorios: operacion.recordatorios,
  };
  function buscarCliente(id: string): ClientePanel {
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
  return { ...operacion, datos, buscarCliente };
}
const Context = createContext<ReturnType<typeof useEstadoArtista> | null>(null);
export function ArtistPanelProvider({ children }: { children: ReactNode }) {
  const estado = useEstadoArtista();
  return <Context.Provider value={estado}>{children}</Context.Provider>;
}
export function useArtistPanel() {
  const contexto = useContext(Context);
  if (!contexto) throw new Error('El panel requiere ArtistPanelProvider.');
  return contexto;
}
