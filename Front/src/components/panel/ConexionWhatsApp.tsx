'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Modal from 'react-bootstrap/Modal';
import { apiFetch } from '@/lib/api-client';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import styles from './workspace.module.css';

type Meta = { appId: string; configId: string; version: string; intento: string };
type Conexion = {
  estado: 'SIN_CONEXION' | 'PILOTO' | 'REQUIERE_PIN' | 'PENDIENTE' | 'CONECTADA' | 'VENCIDA';
  telefono: string | null;
  meta: Meta | null;
};
type SDK = {
  init: (config: { appId: string; version: string }) => void;
  login: (
    callback: (respuesta: { authResponse?: { code?: string } } | undefined) => void,
    opciones: {
      config_id: string;
      response_type: 'code';
      override_default_response_type: true;
      extras: { version: 'v5' };
    },
  ) => void;
};
type Numero = { wabaIds: string[]; numeroId: string };
const origenesMeta = [
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://business.facebook.com',
];
const ruta = '/mensajes/whatsapp/conexion';

function leerEvento(evento: MessageEvent) {
  if (!origenesMeta.includes(evento.origin)) return null;
  try {
    const valor = typeof evento.data === 'string' ? JSON.parse(evento.data) : evento.data;
    return valor?.type === 'WA_EMBEDDED_SIGNUP'
      ? (valor as {
          event: string;
          data?: { waba_id?: string; messaging_account_ids?: string[]; phone_number_id?: string };
        })
      : null;
  } catch {
    return null;
  }
}

export function ConexionWhatsApp() {
  const { datos, cargando, error: errorConsulta, recargar } = usePanelData<Conexion>(ruta, 30000);
  const [sdk, setSdk] = useState<SDK | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const popup = useRef<(() => void) | null>(null);
  const estado = datos?.estado;
  const meta = datos?.meta;
  const pendiente = estado === 'REQUIERE_PIN' || estado === 'PENDIENTE';
  const permiteAlta = estado === 'SIN_CONEXION' || estado === 'VENCIDA' || estado === 'PILOTO';
  useEffect(() => () => popup.current?.(), []);

  if (estado === 'SIN_CONEXION' && !meta) return null;

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    setError('');
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar la conexión.');
    } finally {
      await recargar();
      setOcupado(false);
    }
  }

  function abrir() {
    if (!meta || !sdk || popup.current || ocupado) return;
    const intento = meta.intento;
    let numero: Numero | undefined;
    let code: string | undefined;
    let esperaDatos: ReturnType<typeof setTimeout>;
    function cerrar() {
      clearTimeout(vencimiento);
      clearTimeout(esperaDatos);
      window.removeEventListener('message', alRecibir);
      popup.current = null;
    }
    function finalizar(mensaje: string) {
      if (popup.current !== cerrar) return;
      cerrar();
      setError(mensaje);
      setOcupado(false);
    }
    function completar() {
      if (!numero || !code || popup.current !== cerrar) return;
      const payload = { ...numero, code, intento };
      cerrar();
      void ejecutar(async () => {
        const respuesta = await mutarPanel(ruta, 'POST', payload);
        const { requierePin } = (await respuesta.json()) as { requierePin: boolean };
        if (!requierePin) await mutarPanel(ruta + '/activar', 'POST', {});
      });
    }
    function alRecibir(evento: MessageEvent) {
      const valor = leerEvento(evento);
      if (!valor) return;
      if (valor.event === 'CANCEL') finalizar('La conexión con Meta se canceló.');
      if (valor.event === 'ERROR') finalizar('Meta interrumpió la conexión. Volvé a intentarlo.');
      if (valor.event === 'FINISH_ONLY_WABA')
        finalizar('Elegí un número de WhatsApp en Meta para continuar.');
      if (valor.event !== 'FINISH' && valor.event !== 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING')
        return;
      const { waba_id, messaging_account_ids, phone_number_id } = valor.data ?? {};
      const wabaIds = Array.isArray(messaging_account_ids)
        ? messaging_account_ids
        : waba_id
          ? [waba_id]
          : [];
      if (!wabaIds.length || !phone_number_id) {
        finalizar('Meta no devolvió un número. Revisá la configuración de Embedded Signup.');
        return;
      }
      numero = { wabaIds, numeroId: phone_number_id };
      completar();
    }
    setError('');
    setOcupado(true);
    popup.current = cerrar;
    window.addEventListener('message', alRecibir);
    const vencimiento = setTimeout(
      () => finalizar('El asistente tardó demasiado. Volvé a abrirlo.'),
      720000,
    );
    try {
      sdk.login(
        (respuesta) => {
          if (popup.current !== cerrar) return;
          code = respuesta?.authResponse?.code;
          if (!code) {
            finalizar('Meta no confirmó la autorización de WhatsApp.');
            return;
          }
          esperaDatos = setTimeout(
            () => finalizar('Meta no devolvió los datos del número.'),
            10000,
          );
          completar();
        },
        {
          config_id: meta.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { version: 'v5' },
        },
      );
    } catch {
      finalizar('No pudimos abrir el asistente. Revisá el bloqueo de ventanas emergentes.');
    }
  }

  function activar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const pin = new FormData(evento.currentTarget).get('pin');
    void ejecutar(async () => {
      await mutarPanel(ruta + '/activar', 'POST', pin ? { pin } : {});
    });
  }

  return (
    <section className={styles.surface} aria-labelledby="conexion-whatsapp">
      <div className={styles.surfaceHeading}>
        <h3 id="conexion-whatsapp" className="m-0 fs-6">
          WhatsApp
        </h3>
        {estado === 'CONECTADA' && meta && <strong>Conectado</strong>}
      </div>
      <div className={styles.surfaceBody}>
        {cargando && <p role="status">Consultando conexión…</p>}
        {(error || errorConsulta) && (
          <p className="alert alert-danger" role="alert">
            {error || errorConsulta}
          </p>
        )}
        {!datos && errorConsulta && (
          <button className={styles.secondaryButton} onClick={() => void recargar()}>
            Reintentar
          </button>
        )}
        {datos && (
          <>
            {estado === 'CONECTADA' && <p>{datos.telefono}</p>}
            {!meta && estado !== 'PILOTO' && (
              <p>La conexión con Meta todavía no está habilitada.</p>
            )}
            {estado === 'VENCIDA' && <p>Volvé a autorizar {datos.telefono} en Meta.</p>}
            {estado === 'PILOTO' && <p>Número configurado por administración.</p>}
            {meta && estado === 'SIN_CONEXION' && (
              <p>Conectá el número de WhatsApp Business del estudio.</p>
            )}
            {meta && permiteAlta && (
              <>
                <Script
                  src="https://connect.facebook.net/es_LA/sdk.js"
                  crossOrigin="anonymous"
                  onReady={() => {
                    const facebook = (window as Window & { FB?: SDK }).FB;
                    if (!facebook) {
                      setError('No pudimos cargar el asistente de Meta.');
                      return;
                    }
                    try {
                      facebook.init({ appId: meta.appId, version: meta.version });
                      setSdk(facebook);
                    } catch {
                      setError('No pudimos iniciar el asistente de Meta.');
                    }
                  }}
                  onError={() => setError('No pudimos cargar el asistente de Meta.')}
                />
                <button className={styles.button} onClick={abrir} disabled={ocupado || !sdk}>
                  {ocupado
                    ? 'Conectando…'
                    : estado === 'VENCIDA'
                      ? 'Volver a conectar'
                      : 'Conectar con Meta'}
                </button>
              </>
            )}
            {pendiente && (
              <form onSubmit={activar} className="d-flex flex-wrap align-items-end gap-2 mb-2">
                {estado === 'REQUIERE_PIN' && (
                  <label>
                    PIN de verificación en dos pasos
                    <input
                      name="pin"
                      type="password"
                      className="form-control"
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                )}
                <button className={styles.button} type="submit" disabled={!meta || ocupado}>
                  {ocupado ? 'Activando…' : 'Activar WhatsApp'}
                </button>
              </form>
            )}
            {(pendiente || estado === 'CONECTADA' || estado === 'VENCIDA') && (
              <button
                className={styles.secondaryButton}
                disabled={ocupado}
                onClick={() => setConfirmar(true)}
              >
                Desconectar
              </button>
            )}
          </>
        )}
      </div>
      <Modal
        show={confirmar}
        onHide={() => {
          if (!ocupado) setConfirmar(false);
        }}
        centered
        aria-labelledby="desconectar-whatsapp"
      >
        <Modal.Header closeButton={!ocupado} closeLabel="Cerrar">
          <Modal.Title as="h2" id="desconectar-whatsapp">
            Desconectar WhatsApp
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            La bandeja dejará de recibir mensajes de este número. El historial seguirá disponible.
          </p>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-danger"
            disabled={ocupado}
            onClick={() =>
              void ejecutar(async () => {
                await apiFetch(ruta, { method: 'DELETE', signal: AbortSignal.timeout(15000) });
                setConfirmar(false);
              })
            }
          >
            {ocupado ? 'Desconectando…' : 'Confirmar desconexión'}
          </button>
        </Modal.Body>
      </Modal>
    </section>
  );
}
