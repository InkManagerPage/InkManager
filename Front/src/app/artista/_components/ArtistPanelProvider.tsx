'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/store/AuthProvider';
import { crearEstadoArtista, consultaParaResumen } from '@/lib/estado-panel';
import { useConsultas } from '@/hooks/useConsultas';
import { recuperarPanel } from '@/lib/panel-storage';
import { validarRecordatorios } from '@/lib/recordatorios';
import type { RecordatoriosPanel } from '@/types/recordatorios';
import type { CicloPlan } from '@/types/suscripcion';
import type { ClientePanel, DatosPanelArtista } from '@/types/panel-artista';

interface PanelContexto {
  datos: DatosPanelArtista;
  buscarCliente: (id: string) => ClientePanel;
  enviarMensaje: (id: string, texto: string) => void;
  guardarBorradorMensaje: (id: string, texto: string) => void;
  reintentarMensaje: (conversacionId: string, mensajeId: string) => void;
  leerConversacion: (id: string) => void;
  leerNotificacion: (id?: string) => void;
  guardarRecordatorios: (configuracion: RecordatoriosPanel) => string;
  cambiarCiclo: (ciclo: CicloPlan) => void;
  cancelarRenovacion: () => void;
  reactivarRenovacion: () => void;
}
const PanelContext = createContext<PanelContexto | null>(null);

function cargarDatos(clave: string): DatosPanelArtista {
  try {
    const valor = localStorage.getItem(clave);
    const guardados = recuperarPanel(JSON.parse(valor || 'null'));
    if (guardados) return guardados;
  } catch {
    // Un almacenamiento bloqueado o antiguo no impide abrir el panel.
  }
  return crearEstadoArtista();
}

export function ArtistPanelProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const clave = `inkmanager:panel-artista:v3:${usuario!.id}`;
  const [locales, setDatos] = useState(() => cargarDatos(clave));
  const { datos: fuente } = useConsultas();
  const datos: DatosPanelArtista = {
    ...locales,
    clientes: fuente?.clientes || [],
    citas: fuente?.citas || [],
    consultas: (fuente?.consultas || []).map((c) => consultaParaResumen(c, usuario!.id)),
    estudio:
      fuente?.contexto.tipo === 'ESTUDIO'
        ? {
            nombre: fuente.contexto.nombre,
            ciudad: '',
            direccion: '',
            email: '',
            integrantes: fuente.equipo
              .filter((a) => a.id !== usuario!.id)
              .map((a) => ({ nombre: a.nombre, especialidad: a.estilos, rol: 'Artista' })),
          }
        : null,
    invitacion: null,
  };
  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(locales));
    } catch {
      /* La vista sigue funcionando sin persistencia. */
    }
  }, [clave, locales]);

  function buscarCliente(id: string) {
    return (
      datos.clientes.find((cliente) => cliente.id === id) || {
        id,
        nombre: 'Cliente no disponible',
        email: '',
        telefono: '',
        ciudad: '',
        notas: '',
      }
    );
  }
  function enviarMensaje(id: string, texto: string) {
    if (!texto.trim() || texto.trim().length > 2000) return;
    const mensaje = {
      id: crypto.randomUUID(),
      texto: texto.trim(),
      propio: true,
      fecha: new Date().toISOString(),
      estado: 'ENVIADO' as const,
    };
    setDatos((actuales) => ({
      ...actuales,
      conversaciones: actuales.conversaciones.map((item) =>
        item.id === id ? { ...item, sinLeer: 0, mensajes: [...item.mensajes, mensaje] } : item,
      ),
    }));
  }
  function guardarBorradorMensaje(id: string, texto: string) {
    setDatos((actuales) => ({
      ...actuales,
      borradoresMensajes: { ...actuales.borradoresMensajes, [id]: texto.slice(0, 2000) },
    }));
  }
  function reintentarMensaje(conversacionId: string, mensajeId: string) {
    setDatos((actuales) => ({
      ...actuales,
      conversaciones: actuales.conversaciones.map((conversacion) =>
        conversacion.id === conversacionId
          ? {
              ...conversacion,
              mensajes: conversacion.mensajes.map((mensaje) =>
                mensaje.id === mensajeId && mensaje.estado === 'ERROR'
                  ? { ...mensaje, estado: 'ENVIADO' }
                  : mensaje,
              ),
            }
          : conversacion,
      ),
    }));
  }
  function leerConversacion(id: string) {
    setDatos((actuales) => ({
      ...actuales,
      conversaciones: actuales.conversaciones.map((item) =>
        item.id === id ? { ...item, sinLeer: 0 } : item,
      ),
    }));
  }
  function leerNotificacion(id?: string) {
    setDatos((actuales) => ({
      ...actuales,
      notificaciones: actuales.notificaciones.map((item) =>
        !id || item.id === id ? { ...item, leida: true } : item,
      ),
    }));
  }
  function guardarRecordatorios(configuracion: RecordatoriosPanel) {
    const error = validarRecordatorios(configuracion);
    if (error) return error;
    setDatos((actuales) => ({ ...actuales, recordatorios: configuracion }));
    return '';
  }
  function cambiarCiclo(ciclo: CicloPlan) {
    setDatos((actuales) => ({
      ...actuales,
      suscripcion: {
        ...actuales.suscripcion,
        cicloProximo: ciclo === actuales.suscripcion.ciclo ? null : ciclo,
      },
    }));
  }
  function cancelarRenovacion() {
    setDatos((actuales) => ({
      ...actuales,
      suscripcion: {
        ...actuales.suscripcion,
        estado: 'CANCELACION_PROGRAMADA',
        cicloProximo: null,
      },
    }));
  }
  function reactivarRenovacion() {
    setDatos((actuales) => ({
      ...actuales,
      suscripcion: { ...actuales.suscripcion, estado: 'ACTIVA' },
    }));
  }
  return (
    <PanelContext.Provider
      value={{
        datos,
        buscarCliente,
        enviarMensaje,
        guardarBorradorMensaje,
        reintentarMensaje,
        leerConversacion,
        leerNotificacion,
        guardarRecordatorios,
        cambiarCiclo,
        cancelarRenovacion,
        reactivarRenovacion,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function useArtistPanel() {
  const contexto = useContext(PanelContext);
  if (!contexto) throw new Error('El panel requiere ArtistPanelProvider.');
  return contexto;
}
