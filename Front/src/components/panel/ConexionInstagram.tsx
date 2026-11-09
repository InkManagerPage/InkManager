'use client';

import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { useSearchParams } from 'next/navigation';
import { usePanelData } from '@/hooks/usePanelData';
import { apiFetch } from '@/lib/api-client';
import styles from './workspace.module.css';

type Conexion = {
  disponible: boolean;
  estado: 'CONECTADA' | 'VENCIDA' | 'SIN_CONEXION';
  usuario: string | null;
};

const ruta = '/mensajes/instagram/conexion';
const errores = {
  cancelado: 'Cancelaste la autorización de Instagram.',
  conflicto: 'La cuenta ya está vinculada. Revisá la conexión antes de intentarlo de nuevo.',
  sin_cuenta: 'Volvé a conectar y elegí una cuenta profesional de Instagram.',
  varias_cuentas: 'Volvé a conectar y seleccioná solo la cuenta que querés usar en la bandeja.',
  error: 'No pudimos conectar Instagram. Revisá los permisos de mensajes y volvé a intentarlo.',
};

export function ConexionInstagram({ alCambiar }: { alCambiar: () => Promise<void> }) {
  const { datos, cargando, error: errorConsulta, recargar } = usePanelData<Conexion>(ruta, 30000);
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const resultado = useSearchParams().get('instagram');
  const aviso =
    resultado && Object.hasOwn(errores, resultado)
      ? errores[resultado as keyof typeof errores]
      : '';
  const conectada = datos?.estado === 'CONECTADA';

  async function desconectar() {
    setOcupado(true);
    setError('');
    try {
      await apiFetch(ruta, { method: 'DELETE', signal: AbortSignal.timeout(15000) });
      setConfirmar(false);
      await Promise.all([recargar(), alCambiar()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos desconectar Instagram.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={styles.surface} aria-labelledby="conexion-instagram">
      <div className={styles.surfaceHeading}>
        <h2 id="conexion-instagram">Instagram</h2>
        {conectada && datos.disponible && <strong>Conectado</strong>}
      </div>
      <div className={styles.surfaceBody}>
        {cargando && <p role="status">Consultando conexión…</p>}
        {errorConsulta && (
          <p role="alert">
            {errorConsulta}{' '}
            <button className={styles.textButton} onClick={() => void recargar()}>
              Reintentar
            </button>
          </p>
        )}
        {aviso && !conectada && (
          <p className="alert alert-warning" role="alert">
            {aviso}
          </p>
        )}
        {datos && (
          <>
            {!datos.disponible && <p>La conexión con Instagram todavía no está habilitada.</p>}
            {conectada && <p>@{datos.usuario}</p>}
            {datos.estado === 'VENCIDA' && (
              <p>Volvé a autorizar @{datos.usuario} para responder.</p>
            )}
            {datos.disponible && !conectada && (
              <a href="/api/mensajes/instagram/conectar" className={styles.button}>
                {datos.estado === 'VENCIDA' ? 'Volver a conectar' : 'Conectar Instagram'}
              </a>
            )}
            {(conectada || datos.estado === 'VENCIDA') && (
              <button className={styles.secondaryButton} onClick={() => setConfirmar(true)}>
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
        aria-labelledby="desconectar-instagram"
      >
        <Modal.Header closeButton={!ocupado} closeLabel="Cerrar">
          <Modal.Title as="h2" id="desconectar-instagram">
            Desconectar Instagram
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            La bandeja dejará de recibir mensajes de esta cuenta. El historial seguirá disponible.
          </p>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-danger" disabled={ocupado} onClick={() => void desconectar()}>
            {ocupado ? 'Desconectando…' : 'Confirmar desconexión'}
          </button>
        </Modal.Body>
      </Modal>
    </section>
  );
}
