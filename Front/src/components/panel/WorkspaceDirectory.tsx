'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '@/store/AuthProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { mutarPanel } from '@/hooks/usePanelData';
import { recordatoriosCliente } from '@/lib/recordatorios';
import type { ClientePanel } from '@/types/panel-artista';
import { PageHeader, EmptyState, Avatar } from './PanelUI';
import { PanelField, PanelForm, PanelSubmitButton } from './PanelForm';
import { TeamWorkspace } from './TeamWorkspace';
import styles from './workspace.module.css';
export function WorkspaceDirectory({ tipo }: { tipo: 'CLIENTES' | 'EQUIPO' }) {
  return tipo === 'EQUIPO' ? <TeamWorkspace /> : <ClientsDirectory />;
}
function ClientsDirectory() {
  const { datos, error, cargando, recargar } = useConsultas();
  const { usuario } = useAuth();
  const [editando, setEditando] = useState<ClientePanel | null>(null);
  const [aviso, setAviso] = useState('');
  const base = usuario?.rol === 'ESTUDIO_ADMIN' ? '/estudio' : '/artista';
  return (
    <>
      <PageHeader titulo="Clientes" />
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      {error && (
        <p className={styles.notice} role="alert">
          {error}
          <button
            className={styles.textButton}
            onClick={() => {
              void recargar();
            }}
          >
            Reintentar
          </button>
        </p>
      )}
      {cargando && !datos ? (
        <p role="status">Cargando…</p>
      ) : (
        <section className={styles.surface}>
          {datos?.clientes.length ? (
            datos.clientes.map((c) => (
              <article className={styles.mobileItem} key={c.id}>
                <div className={styles.identity}>
                  <Avatar nombre={c.nombre} />
                  <div>
                    <strong>{c.nombre}</strong>
                    <small>{c.ciudad}</small>
                  </div>
                </div>
                <p>{c.email}</p>
                <p>{c.telefono}</p>
                {c.editable && (
                  <button className={styles.textButton} onClick={() => setEditando(c)}>
                    Editar contacto
                  </button>
                )}
                <Link href={base + '/consultas?cliente=' + c.id} className={styles.textButton}>
                  Ver consultas y propuestas
                </Link>
                <p>
                  <Link
                    href={
                      base + '/agenda?cliente=' + c.id + '&rango=todos&vista=LISTA&canceladas=1'
                    }
                    className={styles.textButton}
                  >
                    Ver turnos ({datos.citas.filter((t) => t.clienteId === c.id).length})
                  </Link>
                </p>
              </article>
            ))
          ) : (
            <EmptyState titulo="Todavía no hay clientes" />
          )}
        </section>
      )}
      <Modal show={Boolean(editando)} onHide={() => setEditando(null)} centered scrollable>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2">Editar contacto</Modal.Title>
        </Modal.Header>
        {editando && (
          <Modal.Body>
            <PanelForm
              initialValues={{
                nombre: editando.nombre,
                telefono: editando.telefono,
                ciudad: editando.ciudad,
                notas: editando.notas,
                reglas: Object.fromEntries(
                  recordatoriosCliente.map(({ id }) => [
                    id,
                    editando.recordatorios?.[id] === undefined
                      ? ''
                      : String(editando.recordatorios[id]),
                  ]),
                ),
              }}
              validate={(v) =>
                v.nombre.trim().length < 2 ? { nombre: 'Ingresá al menos 2 caracteres.' } : {}
              }
              onSave={async (v) => {
                await mutarPanel('/operacion/contactos/' + editando.id, 'PATCH', {
                  ...v,
                  recordatorios: Object.fromEntries(
                    Object.entries(v.reglas)
                      .filter(([, valor]) => valor !== '')
                      .map(([id, valor]) => [id, valor === 'true']),
                  ),
                });
                void recargar();
              }}
              onSaved={() => {
                setEditando(null);
                setAviso('Contacto guardado.');
              }}
            >
              <PanelField name="nombre" label="Nombre" maxLength={80} required />
              <PanelField name="telefono" label="Teléfono" type="tel" maxLength={30} />
              <PanelField name="ciudad" label="Ciudad" maxLength={100} />
              <PanelField name="notas" label="Notas" as="textarea" rows={3} maxLength={1000} />
              <h3 className="h6">Recordatorios</h3>
              {recordatoriosCliente.map(({ id, titulo }) => (
                <PanelField key={id} name={'reglas.' + id} label={titulo} as="select">
                  <option value="">Usar regla general</option>
                  <option value="true">Activado</option>
                  <option value="false">Desactivado</option>
                </PanelField>
              ))}
              <PanelSubmitButton>Guardar contacto</PanelSubmitButton>
            </PanelForm>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
}
