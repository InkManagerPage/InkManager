'use client';
import Accordion from 'react-bootstrap/Accordion';
import type { InvitacionEquipo } from '@/types/equipo';
import styles from './workspace.module.css';

export type AccionInvitacion = 'ACEPTAR' | 'RECHAZAR' | 'CANCELAR' | 'REENVIAR';
const nombres = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  VENCIDA: 'Vencida',
};
const fecha = (valor: string) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(valor));
export function InvitationList({
  invitaciones,
  titular,
  puedeAceptar,
  onAction,
}: {
  invitaciones: InvitacionEquipo[];
  titular: boolean;
  puedeAceptar: boolean;
  onAction: (i: InvitacionEquipo, a: AccionInvitacion) => void;
}) {
  const pendientes = invitaciones.filter((i) => i.estado === 'PENDIENTE'),
    historial = invitaciones.filter((i) => i.estado !== 'PENDIENTE');
  function fila(i: InvitacionEquipo) {
    return (
      <article className={styles.mobileItem} key={i.id}>
        <div className={styles.mobileItemHeader}>
          <strong>{titular ? i.email : i.estudioNombre}</strong>
          <span className={styles.status}>{nombres[i.estado]}</span>
        </div>
        <p>
          {i.estado === 'PENDIENTE'
            ? `Vence el ${fecha(i.expiraAt)}`
            : `Invitación del ${fecha(i.createdAt)}`}
        </p>
        {titular && i.estado === 'PENDIENTE' && (
          <p className={i.estadoEnvio === 'ERROR' ? 'text-danger' : styles.muted}>
            {i.estadoEnvio === 'ENVIADA'
              ? 'Correo enviado.'
              : i.estadoEnvio === 'ERROR'
                ? 'No se pudo confirmar el envío del correo.'
                : 'Envío del correo sin confirmar.'}
          </p>
        )}
        {i.estado === 'PENDIENTE' && (
          <div className={styles.headerActions}>
            {titular ? (
              <>
                <button
                  className={styles.secondaryButton}
                  disabled={!i.puedeReenviar}
                  title={!i.puedeReenviar ? 'Podés reenviar después de un minuto.' : undefined}
                  onClick={() => onAction(i, 'REENVIAR')}
                >
                  Reenviar
                </button>
                <button className={styles.textButton} onClick={() => onAction(i, 'CANCELAR')}>
                  Cancelar invitación
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.button}
                  disabled={!puedeAceptar}
                  onClick={() => onAction(i, 'ACEPTAR')}
                >
                  Revisar invitación
                </button>
                <button className={styles.secondaryButton} onClick={() => onAction(i, 'RECHAZAR')}>
                  Rechazar
                </button>
              </>
            )}
          </div>
        )}
      </article>
    );
  }
  return (
    <>
      {(titular || pendientes.length > 0) && (
        <section className={styles.surface} aria-label="Invitaciones pendientes">
          <div className={styles.surfaceHeading}>
            <h2>Invitaciones pendientes</h2>
            <span>{pendientes.length}</span>
          </div>
          {pendientes.length ? (
            pendientes.map(fila)
          ) : (
            <p className={styles.surfaceBody}>No hay invitaciones pendientes.</p>
          )}
          {!titular && !puedeAceptar && (
            <p className={styles.surfaceBody}>
              Ya pertenecés a un estudio. Deben desvincularte de ese equipo antes de incorporarte a
              otro.
            </p>
          )}
        </section>
      )}
      {titular && historial.length > 0 && (
        <Accordion>
          <Accordion.Item eventKey="historial">
            <Accordion.Header>Historial de invitaciones ({historial.length})</Accordion.Header>
            <Accordion.Body>{historial.map(fila)}</Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}
    </>
  );
}
