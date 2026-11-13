'use client';

import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '@/store/AuthProvider';
import styles from '@/components/panel/workspace.module.css';

export function BotonEliminarCuenta({
  rol,
}: {
  rol: 'ARTISTA' | 'ESTUDIO_ADMIN' | 'CLIENTE';
}) {
  const { eliminarCuenta } = useAuth();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const esEstudio = rol === 'ESTUDIO_ADMIN';
  const esCliente = rol === 'CLIENTE';

  async function confirmarEliminacion() {
    setProcesando(true);
    setError('');
    try {
      await eliminarCuenta();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos eliminar la cuenta. Intentá nuevamente más tarde.',
      );
      setProcesando(false);
    }
  }

  return (
    <>
      <section className={styles.settingsSection}>
        <div>
          <h2 style={{ color: '#b91c1c' }}>Zona de peligro</h2>
          <p>
            {esEstudio
              ? 'Dar de baja el estudio y desactivar el acceso administrativo.'
              : esCliente
                ? 'Dar de baja tu cuenta de cliente en InkManager.'
                : 'Dar de baja tu cuenta de artista en InkManager.'}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setMostrarModal(true)}
            style={{
              padding: '8px 16px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Eliminar mi cuenta
          </button>
        </div>
      </section>

      <Modal
        show={mostrarModal}
        onHide={() => !procesando && setMostrarModal(false)}
        centered
        backdrop={procesando ? 'static' : true}
      >
        <Modal.Header closeButton={!procesando}>
          <Modal.Title as="h3" style={{ fontSize: '18px', fontWeight: 600, color: '#111' }}>
            ¿Eliminar tu cuenta de {esEstudio ? 'estudio' : esCliente ? 'cliente' : 'artista'}?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
          <p>
            Esta acción es <strong>permanente e irreversible</strong>. Tu sesión se cerrará y no
            podrás volver a iniciar sesión con estas credenciales.
          </p>
          <p style={{ margin: 0 }}>
            Tus datos personales de acceso serán anonimizados de acuerdo a nuestras políticas de
            privacidad, conservando únicamente los registros numéricos y de citas para fines de
            auditoría interna.
          </p>
          {error && (
            <p role="alert" style={{ marginTop: '12px', color: '#b91c1c', fontWeight: 500 }}>
              {error}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setMostrarModal(false)}
            disabled={procesando}
            style={{ minHeight: '38px', padding: '6px 14px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarEliminacion}
            disabled={procesando}
            style={{
              minHeight: '38px',
              padding: '6px 16px',
              background: '#dc2626',
              color: '#fff',
              border: '1px solid #b91c1c',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: procesando ? 'wait' : 'pointer',
            }}
          >
            {procesando ? 'Eliminando…' : 'Sí, eliminar cuenta'}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
