'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { obtenerMiPerfil } from '@/services/artistas.service';
import type { PerfilArtista } from '@/types/artista';

interface PerfilContexto {
  perfil: PerfilArtista | null;
  actualizarPerfil: (perfil: PerfilArtista) => void;
  error: string;
  reintentar: () => void;
}
const PerfilContext = createContext<PerfilContexto | null>(null);

export function ArtistProfileProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilArtista | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    obtenerMiPerfil(controller.signal)
      .then((datos) => {
        setPerfil(datos);
        setError('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'No pudimos cargar tu perfil.');
      });
    return () => controller.abort();
  }, [intento]);
  return (
    <PerfilContext.Provider
      value={{
        perfil,
        actualizarPerfil: setPerfil,
        error,
        reintentar: () => setIntento((valor) => valor + 1),
      }}
    >
      {children}
    </PerfilContext.Provider>
  );
}

export function useArtistProfile() {
  const contexto = useContext(PerfilContext);
  if (!contexto) throw new Error('El perfil requiere ArtistProfileProvider.');
  return contexto;
}
