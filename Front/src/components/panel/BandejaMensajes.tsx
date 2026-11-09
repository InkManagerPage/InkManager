'use client';
import { useCallback, useRef, useState } from 'react';
import { PanelMessages } from './PanelMessages';
import { ConexionWhatsApp } from './ConexionWhatsApp';
import { ConexionInstagram } from './ConexionInstagram';
import { PageHeader } from './PanelUI';
import { useConsultas } from '@/hooks/useConsultas';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import type { ConversacionPanel } from '@/types/panel-artista';

type Canal = ConversacionPanel['canal'];
type Bandeja = {
  conectado: boolean;
  administra: boolean;
  mostrarWhatsApp: boolean;
  conversaciones: ConversacionPanel[];
};
const ruta = (canal: Canal, id: string) => '/mensajes/' + canal.toLowerCase() + '/' + id;

export function BandejaMensajes({
  actualizarResumen,
  titular = false,
}: {
  actualizarResumen: () => Promise<void>;
  titular?: boolean;
}) {
  const { datos, error, cargando, recargar } = usePanelData<Bandeja>('/mensajes', 8000);
  const consultas = useConsultas();
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [errorLectura, setErrorLectura] = useState('');
  const leyendo = useRef(new Set<string>());
  const intento = useRef<{ id: string; texto: string; clave: string } | null>(null);
  const leerConversacion = useCallback(
    async (id: string, canal: Canal, hasta: string) => {
      const clave = id + hasta;
      if (leyendo.current.has(clave)) return;
      leyendo.current.add(clave);
      try {
        await mutarPanel(ruta(canal, id) + '/lectura', 'PATCH', { hasta });
        setErrorLectura('');
        await Promise.all([recargar(), actualizarResumen()]);
      } catch (e) {
        setErrorLectura(
          e instanceof Error ? e.message : 'No pudimos marcar la conversación como leída.',
        );
      } finally {
        leyendo.current.delete(clave);
      }
    },
    [recargar, actualizarResumen],
  );

  if (!datos)
    return (
      <>
        <PageHeader titulo="Mensajes" />
        {cargando ? (
          <p role="status">Cargando conversaciones…</p>
        ) : (
          <div className="alert alert-danger" role="alert">
            {error}{' '}
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              onClick={() => void recargar()}
            >
              Reintentar
            </button>
          </div>
        )}
      </>
    );

  async function enviarMensaje(id: string, canal: Canal, texto: string) {
    if (!intento.current || intento.current.id !== id || intento.current.texto !== texto)
      intento.current = { id, texto, clave: crypto.randomUUID() };
    await mutarPanel(ruta(canal, id), 'POST', { texto, clave: intento.current.clave });
    intento.current = null;
    await Promise.all([recargar(), actualizarResumen()]);
  }

  return (
    <PanelMessages
      datos={{ conversaciones: datos.conversaciones, borradoresMensajes: borradores }}
      conectado={datos.conectado}
      errorConexion={error || errorLectura}
      conexion={
        datos.administra ? (
          <div className="d-grid gap-2 mb-3">
            <ConexionInstagram alCambiar={recargar} />
            {titular && datos.mostrarWhatsApp && <ConexionWhatsApp alCambiar={recargar} />}
          </div>
        ) : undefined
      }
      consultas={consultas.datos?.contexto.administra ? consultas.datos.consultas : undefined}
      buscarCliente={(id) => {
        const c = datos.conversaciones.find((item) => item.id === id);
        return {
          id,
          nombre: c?.nombre || c?.telefono || 'Contacto',
          telefono: c?.telefono || '',
          email: '',
          ciudad: '',
          notas: '',
        };
      }}
      leerConversacion={leerConversacion}
      enviarMensaje={enviarMensaje}
      guardarBorradorMensaje={(id, texto) => setBorradores((d) => ({ ...d, [id]: texto }))}
      vincularConsulta={async (id, canal, solicitudId) => {
        await mutarPanel(ruta(canal, id) + '/consulta', 'PUT', { solicitudId });
        await Promise.all([recargar(), actualizarResumen()]);
      }}
    />
  );
}
