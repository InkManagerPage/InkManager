'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerDisponibilidad } from '@/services/disponibilidad.service';
import type { DisponibilidadAgenda } from '@/types/disponibilidad';
export function useDisponibilidad(artistaId: string) {
  const [estado, setEstado] = useState<{
    id: string;
    actualizadoAt: number;
    datos: DisponibilidadAgenda | null;
    error: string;
  }>({ id: '', datos: null, error: '', actualizadoAt: 0 });
  const peticion = useRef<AbortController | null>(null),
    canal = useRef<BroadcastChannel | null>(null);
  const recargar = useCallback(async () => {
    peticion.current?.abort();
    if (!artistaId) return null;
    const c = new AbortController();
    peticion.current = c;
    try {
      const datos = await obtenerDisponibilidad(artistaId, c.signal);
      if (c.signal.aborted) return null;
      setEstado({ id: artistaId, datos, error: '', actualizadoAt: Date.now() });
      return datos;
    } catch (e) {
      if (!c.signal.aborted)
        setEstado((s) => ({
          id: artistaId,
          actualizadoAt: s.actualizadoAt,
          datos: s.id === artistaId ? s.datos : null,
          error: e instanceof Error ? e.message : 'No pudimos cargar la disponibilidad.',
        }));
      return null;
    }
  }, [artistaId]);
  useEffect(() => {
    void recargar();
    const actualizar = () => {
      if (document.visibilityState === 'visible') void recargar();
    };
    const timer = setInterval(actualizar, 30000);
    document.addEventListener('visibilitychange', actualizar);
    if ('BroadcastChannel' in window) {
      canal.current = new BroadcastChannel('inkmanager-disponibilidad');
      canal.current.onmessage = () => {
        void recargar();
      };
    }
    return () => {
      peticion.current?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', actualizar);
      canal.current?.close();
      canal.current = null;
    };
  }, [recargar]);
  function aplicar(datos: DisponibilidadAgenda) {
    peticion.current?.abort();
    setEstado({ id: artistaId, datos, error: '', actualizadoAt: Date.now() });
    canal.current?.postMessage({ actualizar: true });
  }
  const actual = estado.id === artistaId ? estado : null;
  return {
    datos: actual?.datos || null,
    ahora: actual?.actualizadoAt || 0,
    error: actual?.error || '',
    cargando: Boolean(artistaId && !actual),
    recargar,
    aplicar,
  };
}
