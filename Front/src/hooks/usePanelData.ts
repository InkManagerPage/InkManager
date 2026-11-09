'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export function usePanelData<T>(ruta: string, intervalo = 0) {
  const [estado, setEstado] = useState<{ ruta: string; datos: T | null; error: string } | null>(
    null,
  );
  const peticion = useRef<AbortController | null>(null);
  const recargar = useCallback(async () => {
    peticion.current?.abort();
    const controller = new AbortController();
    peticion.current = controller;
    try {
      const respuesta = await apiFetch(ruta, {
        cache: 'no-store',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
      });
      const datos = (await respuesta.json()) as T;
      if (!controller.signal.aborted) setEstado({ ruta, datos, error: '' });
    } catch (error) {
      if (!controller.signal.aborted)
        setEstado((anterior) => ({
          ruta,
          datos: anterior?.ruta === ruta ? anterior.datos : null,
          error: error instanceof Error ? error.message : 'No pudimos cargar los datos.',
        }));
    } finally {
      if (peticion.current === controller) peticion.current = null;
    }
  }, [ruta]);

  useEffect(() => {
    void recargar();
    const timer = intervalo
      ? setInterval(() => {
          if (!peticion.current && document.visibilityState === 'visible') void recargar();
        }, intervalo)
      : undefined;
    return () => {
      clearInterval(timer);
      peticion.current?.abort();
    };
  }, [recargar, intervalo]);
  const actual = estado?.ruta === ruta ? estado : null;
  return { datos: actual?.datos ?? null, error: actual?.error ?? '', cargando: !actual, recargar };
}

export function mutarPanel(ruta: string, method: 'POST' | 'PATCH' | 'PUT', datos: unknown) {
  return apiFetch(ruta, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(30000),
  });
}
