'use client';
import { useCallback, useState } from 'react';
import { mutarPanel, usePanelData } from './usePanelData';
import { crearRecordatorios } from '@/mocks/recordatorios';
import type { ConversacionPanel, NotificacionPanel } from '@/types/panel-artista';
import type { PerfilEstudio } from '@/types/panel-estudio';
import type { RecordatoriosPanel } from '@/types/recordatorios';

type Operacion = {
  estudio:
    | (PerfilEstudio & {
        ciudadId: number | null;
        provinciaId: number | null;
        pais: string | null;
        plazoPropuestasHoras: number;
      })
    | null;
  recordatorios: RecordatoriosPanel | null;
  recordatoriosClientes: RecordatoriosPanel | null;
  puedeEditarClientes: boolean;
  notificaciones: NotificacionPanel[];
  conversaciones: ConversacionPanel[];
};
const sinActivar = {
  ...crearRecordatorios(),
  clientesHabilitados: false,
  artistaHabilitado: false,
};

export function useOperacion() {
  const { datos, error, cargando, recargar } = usePanelData<Operacion>('/operacion', 30000);
  const [errorAccion, setErrorAccion] = useState('');
  const propios = datos?.recordatorios || sinActivar;
  const negocio = datos?.recordatoriosClientes || sinActivar;
  const recordatorios = {
    ...propios,
    clientesHabilitados: negocio.clientesHabilitados,
    reglas: {
      ...propios.reglas,
      TURNO: negocio.reglas.TURNO,
      CUIDADOS: negocio.reglas.CUIDADOS,
      RESENA: negocio.reglas.RESENA,
    },
  };
  const leerNotificacion = useCallback(
    async (id?: string) => {
      try {
        await mutarPanel('/operacion/notificaciones', 'PATCH', id ? { id } : {});
        setErrorAccion('');
        await recargar();
      } catch (e) {
        setErrorAccion(e instanceof Error ? e.message : 'No pudimos actualizar la notificación.');
      }
    },
    [recargar],
  );
  async function guardarRecordatorios(config: RecordatoriosPanel) {
    try {
      await mutarPanel('/operacion/recordatorios', 'PUT', config);
      await recargar();
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'No pudimos guardar los recordatorios.';
    }
  }
  return {
    operacion: datos,
    errorOperacion: error || errorAccion,
    cargandoOperacion: cargando,
    recargarOperacion: recargar,
    guardarRecordatorios,
    leerNotificacion,
    recordatorios,
  };
}
