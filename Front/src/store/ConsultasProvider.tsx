'use client';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  obtenerConsultas,
  actualizarConsulta,
  guardarPropuesta,
} from '@/services/consultas.service';
import type { BandejaConsultas, ConsultaGuardada } from '@/types/consultas';
import type { PresupuestoPanel } from '@/types/panel-artista';
import { guardarTurno } from '@/services/citas.service';
import type { FormularioCita } from '@/types/citas';

function useConsultasState() {
  const [datos, setDatos] = useState<BandejaConsultas | null>(null),
    [error, setError] = useState(''),
    [cargando, setCargando] = useState(true);
  const peticion = useRef<AbortController | null>(null),
    canal = useRef<BroadcastChannel | null>(null);
  const recargar = useCallback(() => {
    peticion.current?.abort();
    const controller = new AbortController();
    peticion.current = controller;
    return obtenerConsultas(controller.signal)
      .then((respuesta) => {
        if (!controller.signal.aborted) {
          setDatos(respuesta);
          setError('');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'No pudimos cargar las consultas.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
  }, []);
  useEffect(() => {
    void recargar();
    const refrescar = () => {
      if (document.visibilityState === 'visible') void recargar();
    };
    document.addEventListener('visibilitychange', refrescar);
    const timer = setInterval(refrescar, 30000);
    if ('BroadcastChannel' in window) {
      canal.current = new BroadcastChannel('inkmanager-consultas');
      canal.current.onmessage = () => {
        void recargar();
      };
    }
    return () => {
      peticion.current?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refrescar);
      canal.current?.close();
      canal.current = null;
    };
  }, [recargar]);
  function aplicar(consulta: ConsultaGuardada) {
    peticion.current?.abort();
    setDatos((d) =>
      d ? { ...d, consultas: d.consultas.map((c) => (c.id === consulta.id ? consulta : c)) } : d,
    );
    canal.current?.postMessage({ actualizar: true });
  }
  async function cambiar(id: string, entrada: Record<string, unknown>) {
    aplicar(await actualizarConsulta(id, entrada));
  }
  async function proponer(
    id: string,
    entrada: PresupuestoPanel,
    version: number,
    imagen: File | null,
  ) {
    aplicar(await guardarPropuesta(id, entrada, version, imagen));
  }
  async function guardarCita(entrada: FormularioCita, id?: string) {
    const cita = await guardarTurno(entrada, id);
    peticion.current?.abort();
    setDatos((d) =>
      d
        ? {
            ...d,
            citas: [...d.citas.filter((c) => c.id !== cita.id), cita].sort((a, b) =>
              (a.fecha + a.hora).localeCompare(b.fecha + b.hora),
            ),
          }
        : d,
    );
    canal.current?.postMessage({ actualizar: true });
    return cita;
  }
  async function actualizarEquipo() {
    canal.current?.postMessage({ actualizar: true });
    await recargar();
  }
  return { datos, error, cargando, recargar, cambiar, proponer, guardarCita, actualizarEquipo };
}

const Context = createContext<ReturnType<typeof useConsultasState> | null>(null);
export function ConsultasProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useConsultasState()}>{children}</Context.Provider>;
}
export function useConsultas() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta ConsultasProvider.');
  return value;
}
