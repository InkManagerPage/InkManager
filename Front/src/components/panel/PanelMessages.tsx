'use client';

import { useEffect, useRef, type FormEvent } from 'react';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import type { ClientePanel, ConversacionPanel } from '@/types/panel-artista';
import { Avatar, EmptyState, PageHeader, PanelIcon, SearchField } from './PanelUI';
import { mostrarFecha } from '@/lib/panel-artista';
import { nombreCanal } from '@/lib/canales-consulta';
import styles from '@/components/panel/workspace.module.css';
import chat from './messages.module.css';

export interface PanelMessagesProps {
  datos: { conversaciones: ConversacionPanel[]; borradoresMensajes?: Record<string, string> };
  buscarCliente: (id: string) => ClientePanel;
  leerConversacion: (id: string) => void;
  enviarMensaje: (id: string, texto: string) => void;
  guardarBorradorMensaje: (id: string, texto: string) => void;
  reintentarMensaje: (id: string, mensajeId: string) => void;
}
export function PanelMessages(props: PanelMessagesProps) {
  const {
    datos,
    buscarCliente,
    leerConversacion,
    enviarMensaje,
    guardarBorradorMensaje,
    reintentarMensaje,
  } = props;
  const { params, update } = usePanelFilters();
  const busqueda = params.get('q') || '';
  const setBusqueda = (value: string) => update({ q: value || null }, true);
  const soloSinLeer = params.get('sinLeer') === '1';
  const borradores = datos.borradoresMensajes || {};
  const cercaDelFinal = useRef(true);
  const hiloAnterior = useRef<string | undefined>(undefined);
  const fin = useRef<HTMLDivElement>(null);
  const conversaciones = datos.conversaciones
    .filter((item) => !soloSinLeer || item.sinLeer > 0)
    .filter((item) =>
      `${buscarCliente(item.clienteId).nombre} ${item.asunto}`
        .toLocaleLowerCase('es')
        .includes(busqueda.toLocaleLowerCase('es')),
    )
    .sort((a, b) => (b.mensajes.at(-1)?.fecha || '').localeCompare(a.mensajes.at(-1)?.fecha || ''));
  const seleccionada =
    datos.conversaciones.find((item) => item.id === params.get('conversacion')) ||
    (params.has('conversacion') || soloSinLeer ? undefined : conversaciones[0]);
  const cantidad = seleccionada?.mensajes.length || 0;
  const texto = seleccionada ? borradores[seleccionada.id] || '' : '';
  function setTexto(valor: string) {
    if (seleccionada) guardarBorradorMensaje(seleccionada.id, valor);
  }
  useEffect(() => {
    if (fin.current && (hiloAnterior.current !== seleccionada?.id || cercaDelFinal.current))
      fin.current.scrollTop = fin.current.scrollHeight;
    hiloAnterior.current = seleccionada?.id;
  }, [seleccionada?.id, cantidad]);
  useEffect(() => {
    if (
      seleccionada?.sinLeer &&
      (params.has('conversacion') || window.matchMedia('(min-width: 651px)').matches)
    )
      leerConversacion(seleccionada.id);
  }, [seleccionada?.id, seleccionada?.sinLeer, leerConversacion, params]);
  function abrir(id: string) {
    leerConversacion(id);
    update({ conversacion: id });
  }
  function enviar(event: FormEvent) {
    event.preventDefault();
    if (!seleccionada || !texto.trim() || texto.trim().length > 2000) return;
    enviarMensaje(seleccionada.id, texto);
    setTexto('');
  }
  return (
    <>
      <PageHeader titulo="Mensajes" descripcion="El contexto de cada proyecto, a mano." />
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <button
            aria-pressed={!soloSinLeer}
            className={!soloSinLeer ? styles.tabActive : ''}
            onClick={() => update({ sinLeer: null })}
          >
            Todos
          </button>
          <button
            aria-pressed={soloSinLeer}
            className={soloSinLeer ? styles.tabActive : ''}
            onClick={() => update({ sinLeer: '1' })}
          >
            Sin leer
          </button>
        </div>
      </div>
      <section
        className={`${chat.messenger} ${params.has('conversacion') ? chat.mobileThread : ''}`}
        aria-label="Mensajes"
      >
        <aside className={chat.conversations}>
          <div className={chat.searchArea}>
            <SearchField
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar conversación"
            />
          </div>
          <div className={chat.conversationList}>
            {conversaciones.length ? (
              conversaciones.map((item) => {
                const cliente = buscarCliente(item.clienteId);
                const ultimo = item.mensajes.at(-1);
                return (
                  <button
                    className={`${chat.conversation} ${seleccionada?.id === item.id ? chat.selected : ''}`}
                    key={item.id}
                    onClick={() => abrir(item.id)}
                    aria-pressed={seleccionada?.id === item.id}
                  >
                    <Avatar nombre={cliente.nombre} />
                    <span className={chat.conversationInfo}>
                      <strong>{cliente.nombre}</strong>
                      <span>
                        {borradores[item.id]
                          ? `Borrador: ${borradores[item.id]}`
                          : ultimo
                            ? `${ultimo.propio ? 'Vos: ' : ''}${ultimo.texto}`
                            : item.asunto}
                      </span>
                    </span>
                    <span className={chat.conversationMeta}>
                      {ultimo && <time>{mostrarFecha(ultimo.fecha)}</time>}
                      {item.sinLeer > 0 && <i>{item.sinLeer}</i>}
                    </span>
                  </button>
                );
              })
            ) : (
              <EmptyState titulo="Sin conversaciones" detalle="Probá otro nombre o proyecto." />
            )}
          </div>
        </aside>
        {seleccionada ? (
          <div className={chat.thread}>
            <header className={chat.threadHeader}>
              <button
                className={`${styles.textButton} ${chat.back}`}
                aria-label="Volver a conversaciones"
                onClick={() => update({ conversacion: null }, true)}
              >
                <PanelIcon nombre="volver" />
              </button>
              <Avatar nombre={buscarCliente(seleccionada.clienteId).nombre} />
              <div>
                <strong>{buscarCliente(seleccionada.clienteId).nombre}</strong>
                <span>
                  {nombreCanal(seleccionada.canal)} · {seleccionada.asunto}
                </span>
              </div>
            </header>
            <div
              className={chat.messages}
              ref={fin}
              aria-live="polite"
              onScroll={(event) => {
                const element = event.currentTarget;
                cercaDelFinal.current =
                  element.scrollHeight - element.scrollTop - element.clientHeight < 80;
              }}
              role="log"
              aria-label={`Conversación con ${buscarCliente(seleccionada.clienteId).nombre}`}
            >
              {seleccionada.mensajes.length ? (
                seleccionada.mensajes.map((mensaje, indice) => {
                  const dia = mensaje.fecha.slice(0, 10);
                  const nuevoDia =
                    indice === 0 || seleccionada.mensajes[indice - 1]?.fecha.slice(0, 10) !== dia;
                  return (
                    <div key={mensaje.id}>
                      {nuevoDia && (
                        <p className={chat.dateSeparator}>
                          {mostrarFecha(dia, { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                      <div className={`${chat.message} ${mensaje.propio ? chat.outgoing : ''}`}>
                        <p>{mensaje.texto}</p>
                        <time dateTime={mensaje.fecha}>
                          {mostrarFecha(mensaje.fecha, { hour: '2-digit', minute: '2-digit' })}
                          {mensaje.propio && (
                            <span>
                              {mensaje.estado === 'ERROR'
                                ? 'No enviado'
                                : mensaje.estado === 'ENVIANDO'
                                  ? 'Enviando…'
                                  : 'Enviado'}
                            </span>
                          )}
                        </time>
                        {mensaje.propio && mensaje.estado === 'ERROR' && (
                          <button
                            className={styles.textButton}
                            onClick={() => reintentarMensaje(seleccionada.id, mensaje.id)}
                          >
                            Reintentar envío
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  titulo="Empezá la conversación"
                  detalle="Escribí un mensaje para iniciar la conversación."
                />
              )}
            </div>
            <form className={chat.composer} onSubmit={enviar}>
              <label className="visually-hidden" htmlFor="message-text">
                Escribí un mensaje
              </label>
              <textarea
                id="message-text"
                rows={2}
                maxLength={2000}
                value={texto}
                onFocus={() => {
                  if (seleccionada.sinLeer) leerConversacion(seleccionada.id);
                }}
                onChange={(event) => setTexto(event.target.value)}
                placeholder="Escribí un mensaje…"
              />
              <button
                type="submit"
                className={styles.button}
                disabled={!texto.trim()}
                aria-label="Enviar mensaje"
              >
                <PanelIcon nombre="enviar" size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className={chat.thread}>
            <EmptyState
              titulo="Elegí una conversación"
              detalle="Seleccioná un cliente para ver sus mensajes."
            />
          </div>
        )}
      </section>
    </>
  );
}
