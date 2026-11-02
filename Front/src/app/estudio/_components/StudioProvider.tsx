'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/store/AuthProvider';
import { crearEstadoEstudio } from '@/lib/estado-panel';
import { useConsultas } from '@/hooks/useConsultas';
import { validarRecordatorios } from '@/lib/recordatorios';
import type { DatosPanelEstudio } from '@/types/panel-estudio';
import type { RecordatoriosPanel } from '@/types/recordatorios';

function useStudioState() {
  const { usuario } = useAuth();
  const clave = `inkmanager:panel-estudio:v2:${usuario!.id}`;
  const [locales, setDatos] = useState<DatosPanelEstudio>(() => {
    try {
      const guardados = JSON.parse(
        localStorage.getItem(clave) || 'null',
      ) as DatosPanelEstudio | null;
      if (
        guardados?.version === 1 &&
        Array.isArray(guardados.equipo) &&
        Array.isArray(guardados.consultas) &&
        guardados.perfil &&
        guardados.recordatorios &&
        guardados.suscripcion
      )
        return guardados;
    } catch {
      /* Un navegador sin almacenamiento puede usar el panel. */
    }
    return crearEstadoEstudio();
  });
  const { datos: fuente } = useConsultas();
  const datos: DatosPanelEstudio = {
    ...locales,
    perfil: {
      ...locales.perfil,
      nombre: fuente?.contexto.nombre || usuario!.nombre || 'Mi estudio',
      email: locales.perfil.email || usuario!.email,
    },
    equipo: fuente?.equipo || [],
    clientes: fuente?.clientes || [],
    consultas: fuente?.consultas || [],
    citas: fuente?.citas || [],
  };
  const [errorPersistencia, setErrorPersistencia] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(clave, JSON.stringify(locales));
        setErrorPersistencia('');
      } catch {
        setErrorPersistencia(
          'El navegador no pudo guardar los cambios. Se perderán al cerrar esta página.',
        );
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [clave, locales]);
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
  function guardarRecordatorios(config: RecordatoriosPanel) {
    const error = validarRecordatorios(config);
    if (error) return error;
    setDatos((d) => ({ ...d, recordatorios: config }));
    return '';
  }
  function leerConversacion(id: string) {
    setDatos((d) =>
      d.conversaciones.some((c) => c.id === id && c.sinLeer > 0)
        ? {
            ...d,
            conversaciones: d.conversaciones.map((c) => (c.id === id ? { ...c, sinLeer: 0 } : c)),
          }
        : d,
    );
  }
  function enviarMensaje(id: string, texto: string) {
    if (!texto.trim() || texto.length > 2000) return;
    setDatos((d) => ({
      ...d,
      borradoresMensajes: { ...d.borradoresMensajes, [id]: '' },
      conversaciones: d.conversaciones.map((c) =>
        c.id === id
          ? {
              ...c,
              mensajes: [
                ...c.mensajes,
                {
                  id: crypto.randomUUID(),
                  texto: texto.trim(),
                  propio: true,
                  fecha: new Date().toISOString(),
                  estado: 'ENVIADO',
                },
              ],
            }
          : c,
      ),
    }));
  }
  function guardarBorradorMensaje(id: string, texto: string) {
    setDatos((d) => ({
      ...d,
      borradoresMensajes: { ...d.borradoresMensajes, [id]: texto.slice(0, 2000) },
    }));
  }
  function reintentarMensaje(conversacionId: string, mensajeId: string) {
    setDatos((d) => ({
      ...d,
      conversaciones: d.conversaciones.map((c) =>
        c.id === conversacionId
          ? {
              ...c,
              mensajes: c.mensajes.map((m) =>
                m.id === mensajeId ? { ...m, estado: 'ENVIADO' } : m,
              ),
            }
          : c,
      ),
    }));
  }
  return {
    datos,
    setDatos,
    errorPersistencia,
    buscarCliente,
    nombreArtista,
    guardarRecordatorios,
    leerConversacion,
    enviarMensaje,
    guardarBorradorMensaje,
    reintentarMensaje,
  };
}
type StudioContext = ReturnType<typeof useStudioState>;
const Context = createContext<StudioContext | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const value = useStudioState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStudio() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta StudioProvider.');
  return value;
}
