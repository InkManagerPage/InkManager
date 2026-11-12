'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import type {
  ClientePanel,
  ConversacionPanel,
  MensajePanel,
  PaginaMensajes,
} from '@/types/panel-artista';
import { Avatar, EmptyState, PageHeader, PanelIcon, SearchField } from './PanelUI';
import { mostrarFecha } from '@/lib/panel-artista';
import { nombreCanal } from '@/lib/canales-consulta';
import styles from '@/components/panel/workspace.module.css';
import chat from './messages.module.css';

export interface PanelMessagesProps {
  datos: { conversaciones: ConversacionPanel[]; borradoresMensajes?: Record<string, string> };
  buscarCliente: (id: string) => ClientePanel;
  leerConversacion: (id: string, canal: ConversacionPanel['canal'], hasta: string) => Promise<void>;
  cargarHistorial: (
    id: string,
    canal: ConversacionPanel['canal'],
    antes: string,
  ) => Promise<PaginaMensajes>;
  enviarMensaje: (id: string, canal: ConversacionPanel['canal'], texto: string) => Promise<void>;
  cambiarBot: (id: string, activo: boolean) => Promise<void>;
  guardarBorradorMensaje: (id: string, texto: string) => void;
  vincularConsulta: (
    id: string,
    canal: ConversacionPanel['canal'],
    solicitudId: string | null,
  ) => Promise<void>;
  consultas?: { id: string; titulo: string }[];
  conectado: boolean;
  errorConexion: string;
  configuracion?: string;
}
const estadosMensaje = {
  RECIBIDO: '',
  ENVIANDO: 'Enviando…',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  LEIDO: 'Leído',
  ERROR: 'No enviado',
  INCIERTO: 'Envío sin confirmar',
};

function reunirMensajes(...paginas: MensajePanel[][]) {
  return [...new Map(paginas.flat().map((mensaje) => [mensaje.id, mensaje])).values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
  );
}

function CanalChat({ canal }: { canal: ConversacionPanel['canal'] }) {
  if (canal === 'INSTAGRAM')
    return (
      <span className={chat.instagram} role="img" aria-label="Instagram" title="Instagram">
        <PanelIcon nombre="instagram" size={17} />
      </span>
    );
  return <small className={chat.channelLabel}>{nombreCanal(canal)}</small>;
}

export function PanelMessages(props: PanelMessagesProps) {
  const {
    datos,
    buscarCliente,
    leerConversacion,
    cargarHistorial,
    enviarMensaje,
    cambiarBot,
    guardarBorradorMensaje,
    vincularConsulta,
    consultas,
    conectado,
    errorConexion,
    configuracion,
  } = props;
  const { params, update } = usePanelFilters();
  const busqueda = params.get('q') || '';
  const setBusqueda = (value: string) => update({ q: value || null }, true);
  const soloSinLeer = params.get('sinLeer') === '1';
  const canal = params.get('canal') || '';
  const consulta = params.get('consulta');
  const canales = [...new Set(datos.conversaciones.map((hilo) => hilo.canal))];
  const borradores = datos.borradoresMensajes || {};
  const cercaDelFinal = useRef(true);
  const hiloAnterior = useRef<string | undefined>(undefined);
  const fin = useRef<HTMLDivElement>(null);
  const posicionHistorial = useRef<{ id: string; altura: number; arriba: number } | null>(null);
  const [historiales, setHistoriales] = useState<Record<string, PaginaMensajes>>({});
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const conversaciones = datos.conversaciones
    .filter((item) => !consulta || item.solicitudId === consulta)
    .filter((item) => !canal || item.canal === canal)
    .filter((item) => !soloSinLeer || item.sinLeer > 0)
    .filter((item) =>
      `${buscarCliente(item.clienteId).nombre} ${item.asunto}`
        .toLocaleLowerCase('es')
        .includes(busqueda.toLocaleLowerCase('es')),
    )
    .sort((a, b) => (b.mensajes.at(-1)?.fecha || '').localeCompare(a.mensajes.at(-1)?.fecha || ''));
  const seleccionada =
    datos.conversaciones.find(
      (item) =>
        item.id === params.get('conversacion') && (!consulta || item.solicitudId === consulta),
    ) || (params.has('conversacion') || soloSinLeer ? undefined : conversaciones[0]);
  const historial = seleccionada && historiales[seleccionada.id];
  const recientes = seleccionada?.mensajes;
  const mensajes = useMemo(
    () => (historial ? reunirMensajes(historial.mensajes, recientes ?? []) : recientes ?? []),
    [historial, recientes],
  );
  const anterior = historial ? historial.anterior : seleccionada?.anterior;
  const texto = seleccionada ? borradores[seleccionada.id] || '' : '';
  const ultimoRecibido = seleccionada?.mensajes.findLast((m) => !m.propio)?.fecha;
  const idSeleccionado = seleccionada?.id;
  const canalSeleccionado = seleccionada?.canal;
  const maximo = canalSeleccionado === 'INSTAGRAM' ? 1000 : 2000;
  const hiloAbierto = params.has('conversacion');
  const sinLeer = seleccionada?.sinLeer;
  const vencida = Boolean(
    seleccionada?.ventanaHasta && Date.parse(seleccionada.ventanaHasta) <= ahora,
  );
  const puedeResponder = conectado && seleccionada?.puedeResponder !== false;
  const longitud = texto.trim().length;
  const puedeEnviar =
    puedeResponder && !vencida && !guardando && longitud > 0 && longitud <= maximo;
  function setTexto(valor: string) {
    if (seleccionada) guardarBorradorMensaje(seleccionada.id, valor);
  }
  useLayoutEffect(() => {
    const contenedor = fin.current;
    const posicion = posicionHistorial.current;
    if (contenedor && posicion && posicion.id === idSeleccionado) {
      contenedor.scrollTop = posicion.arriba + contenedor.scrollHeight - posicion.altura;
    } else if (contenedor && (hiloAnterior.current !== idSeleccionado || cercaDelFinal.current)) {
      contenedor.scrollTop = contenedor.scrollHeight;
    }
    posicionHistorial.current = null;
    hiloAnterior.current = idSeleccionado;
  }, [idSeleccionado, historial, mensajes.length]);
  useEffect(() => {
    if (
      idSeleccionado &&
      canalSeleccionado &&
      ultimoRecibido &&
      sinLeer &&
      (hiloAbierto || window.matchMedia('(min-width: 651px)').matches)
    )
      void leerConversacion(idSeleccionado, canalSeleccionado, ultimoRecibido);
  }, [idSeleccionado, canalSeleccionado, ultimoRecibido, sinLeer, leerConversacion, hiloAbierto]);
  function abrir(id: string) {
    setError('');
    update({ conversacion: id });
  }
  async function verMensajesAnteriores() {
    if (!seleccionada || !anterior || cargandoHistorial) return;
    const { id, canal, mensajes: recientes } = seleccionada;
    setCargandoHistorial(true);
    setError('');
    try {
      const pagina = await cargarHistorial(id, canal, anterior);
      if (fin.current && hiloAnterior.current === id)
        posicionHistorial.current = {
          id,
          altura: fin.current.scrollHeight,
          arriba: fin.current.scrollTop,
        };
      setHistoriales((previos) => ({
        ...previos,
        [id]: {
          mensajes: reunirMensajes(pagina.mensajes, previos[id]?.mensajes ?? [], recientes),
          anterior: pagina.anterior,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar los mensajes anteriores.');
    } finally {
      setCargandoHistorial(false);
    }
  }
  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (!seleccionada || !puedeEnviar) return;
    await ejecutar(async () => {
      await enviarMensaje(seleccionada.id, seleccionada.canal, texto);
      setTexto('');
    });
  }
  async function ejecutar(accion: () => Promise<void>) {
    setGuardando(true);
    setError('');
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar la operación.');
    } finally {
      setGuardando(false);
    }
  }
  return (
    <>
      <PageHeader titulo="Mensajes" />
      {!conectado && (
        <p className={styles.notice}>
          Todavía no hay un canal conectado para este negocio.
          {configuracion && (
            <>
              {' '}
              <Link href={configuracion} className={styles.textButton}>
                Ir a cuentas asociadas
              </Link>
            </>
          )}
        </p>
      )}
      {(error || errorConexion) && (
        <p className="alert alert-danger" role="alert">
          {error || errorConexion}
        </p>
      )}
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
        {consulta && (
          <button
            type="button"
            className={styles.textButton}
            onClick={() =>
              update({ consulta: null, conversacion: null, sinLeer: null, canal: null, q: null })
            }
          >
            Ver todas las conversaciones
          </button>
        )}
        {(canales.length > 1 || canal) && (
          <select
            className="form-select w-auto"
            aria-label="Filtrar por canal"
            value={canal}
            onChange={(event) => update({ canal: event.target.value || null, conversacion: null })}
          >
            <option value="">Todos los canales</option>
            {canales.map((id) => (
              <option key={id} value={id}>
                {nombreCanal(id)}
              </option>
            ))}
          </select>
        )}
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
                      <span className={chat.nameLine}>
                        <strong>{cliente.nombre}</strong>
                        <CanalChat canal={item.canal} />
                      </span>
                      <span className={chat.preview}>
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
              <EmptyState
                titulo="Sin conversaciones"
                detalle={
                  consulta
                    ? 'No hay una conversación vinculada a esta consulta.'
                    : 'Probá otro nombre o proyecto.'
                }
              />
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
              <div className={chat.threadContact}>
                <div className={chat.nameLine}>
                  <strong>{buscarCliente(seleccionada.clienteId).nombre}</strong>
                  <CanalChat canal={seleccionada.canal} />
                </div>
                {seleccionada.telefono && (
                  <span className={chat.channelLabel}>{seleccionada.telefono}</span>
                )}
              </div>
              {typeof seleccionada.botActivo === 'boolean' && (
                <button
                  className={`btn btn-sm ms-auto flex-shrink-0 ${seleccionada.botActivo ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                  type="button"
                  disabled={guardando}
                  onClick={() => void ejecutar(() => cambiarBot(seleccionada.id, !seleccionada.botActivo))}
                >
                  {seleccionada.botActivo ? 'Pausar bot' : 'Activar bot'}
                </button>
              )}
            </header>
            {consultas && (
              <label className="p-2">
                Consulta vinculada
                <select
                  className="form-select form-select-sm"
                  value={seleccionada.solicitudId || ''}
                  disabled={guardando}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    void ejecutar(() => vincularConsulta(seleccionada.id, seleccionada.canal, id));
                  }}
                >
                  <option value="">Sin consulta vinculada</option>
                  {consultas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
              {anterior &&
                (canalSeleccionado === 'INSTAGRAM' || canalSeleccionado === 'WHATSAPP') && (
                  <button
                    className={`${styles.textButton} align-self-center`}
                    type="button"
                    disabled={cargandoHistorial}
                    onClick={() => void verMensajesAnteriores()}
                  >
                    {cargandoHistorial ? 'Cargando mensajes…' : 'Cargar mensajes anteriores'}
                  </button>
                )}
              {mensajes.length ? (
                mensajes.map((mensaje, indice) => {
                  const dia = mensaje.fecha.slice(0, 10);
                  const nuevoDia = indice === 0 || mensajes[indice - 1]?.fecha.slice(0, 10) !== dia;
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
                            <span>{estadosMensaje[mensaje.estado || 'ENVIADO']}</span>
                          )}
                        </time>
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
            {conectado && !puedeResponder && (
              <p className={styles.notice}>La cuenta de esta conversación está desconectada.</p>
            )}
            {puedeResponder && vencida && (
              <p className="m-2 small">
                La ventana de respuesta cerró. Esperá un nuevo mensaje del cliente.
              </p>
            )}
            <form className={chat.composer} onSubmit={enviar}>
              <label className="visually-hidden" htmlFor="message-text">
                Escribí un mensaje
              </label>
              <textarea
                id="message-text"
                rows={1}
                enterKeyHint="send"
                maxLength={maximo}
                value={texto}
                disabled={!puedeResponder || vencida}
                readOnly={guardando}
                onChange={(event) => setTexto(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing)
                    return;
                  event.preventDefault();
                  if (!event.repeat && puedeEnviar) event.currentTarget.form?.requestSubmit();
                }}
                placeholder="Escribí un mensaje…"
              />
              <button
                type="submit"
                className={chat.send}
                disabled={!puedeEnviar}
                aria-label={guardando ? 'Enviando mensaje' : 'Enviar mensaje'}
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
