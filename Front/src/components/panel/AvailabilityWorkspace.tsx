'use client';
import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '@/store/AuthProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { useDisponibilidad } from '@/hooks/useDisponibilidad';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import { PageHeader, EmptyState } from './PanelUI';
import { PanelForm, PanelSubmitButton } from './PanelForm';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';
import { AvailabilityBlockForm } from './AvailabilityBlocks';
import { quitarBloqueo } from '@/services/disponibilidad.service';
import { mostrarFecha } from '@/lib/panel-artista';
import type { DisponibilidadAgenda, BloqueoAgenda } from '@/types/disponibilidad';
import styles from './workspace.module.css';
import horario from './availability.module.css';
export function AvailabilityWorkspace() {
  return (
    <Suspense fallback={<p role="status">Cargando disponibilidad…</p>}>
      <Availability />
    </Suspense>
  );
}
function Availability() {
  const { usuario } = useAuth(),
    consultas = useConsultas(),
    { params, update } = usePanelFilters(),
    descartar = useDiscardChanges();
  const fuente = consultas.datos;
  const titular = usuario?.rol === 'ESTUDIO_ADMIN',
    base = titular ? '/estudio' : '/artista';
  const artistaId = titular
    ? params.get('artista') || fuente?.equipo[0]?.id || ''
    : usuario?.id || '';
  const gestion = useDisponibilidad(artistaId),
    datos = gestion.datos;
  const [revision, setRevision] = useState(0),
    [aviso, setAviso] = useState(''),
    [pasados, setPasados] = useState(false);
  const [editor, setEditor] = useState<BloqueoAgenda | 'NUEVO' | null>(null),
    [eliminar, setEliminar] = useState<BloqueoAgenda | null>(null);
  const quitado = useRef<DisponibilidadAgenda | null>(null);
  function aplicar(d: DisponibilidadAgenda, mensaje: string) {
    gestion.aplicar(d);
    setRevision((r) => r + 1);
    setAviso(mensaje);
    setEditor(null);
    setEliminar(null);
  }
  function actualizar() {
    descartar(() => {
      setRevision((r) => r + 1);
      void gestion.recargar().then((d) => {
        if (d) {
          setRevision((r) => r + 1);
          setAviso('Disponibilidad actualizada.');
        }
      });
    });
  }
  function abrirEditor(bloqueo: BloqueoAgenda | 'NUEVO') {
    descartar(() => {
      setRevision((r) => r + 1);
      setEditor(bloqueo);
    });
  }
  function confirmarQuitar(bloqueo: BloqueoAgenda) {
    descartar(() => {
      setRevision((r) => r + 1);
      setEliminar(bloqueo);
    });
  }
  const bloques =
    datos?.bloqueos.filter((b) => pasados || new Date(b.finAt).getTime() > gestion.ahora) || [];
  return (
    <>
      <PageHeader
        titulo="Disponibilidad"
        descripcion={
          datos ? `${datos.artista.nombre} · ${datos.zonaHoraria.replaceAll('_', ' ')}` : undefined
        }
      >
        <button className={styles.secondaryButton} onClick={actualizar}>
          Actualizar
        </button>
        <Link
          className={styles.secondaryButton}
          href={`${base}/agenda${titular && artistaId ? `?artista=${artistaId}` : ''}`}
        >
          Ver agenda
        </Link>
      </PageHeader>
      {titular && (
        <label className={horario.artist}>
          Artista
          <select
            className="form-select"
            value={artistaId}
            onChange={(e) => {
              update({ artista: e.target.value });
              setAviso('');
            }}
          >
            {fuente?.equipo.map((a) => (
              <option value={a.id} key={a.id}>
                {a.nombre}
                {a.estado === 'SUSPENDIDO' ? ' · suspendido' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      {gestion.error && (
        <p className="alert alert-danger" role="alert">
          {gestion.error}
        </p>
      )}
      {titular && !fuente ? (
        consultas.cargando ? (
          <p role="status">Cargando equipo…</p>
        ) : (
          <p className="alert alert-danger" role="alert">
            {consultas.error || 'No pudimos cargar el equipo.'}{' '}
            <button
              className={styles.textButton}
              onClick={() => {
                void consultas.recargar();
              }}
            >
              Reintentar
            </button>
          </p>
        )
      ) : !artistaId ? (
        <EmptyState
          titulo={
            titular
              ? 'Agregá un artista al equipo para configurar su disponibilidad'
              : 'Cargando disponibilidad…'
          }
        />
      ) : gestion.cargando ? (
        <p role="status">Cargando disponibilidad…</p>
      ) : (
        datos && (
          <>
            {!datos.semana && (
              <p className={styles.notice}>
                Guardá los horarios de atención para habilitar nuevos turnos. Los turnos existentes
                se conservan.
              </p>
            )}
            {!datos.puedeEditar && (
              <p className={styles.notice}>
                Tu disponibilidad es de solo lectura mientras estés suspendido.
              </p>
            )}
            <WeeklyHoursEditor
              key={`${artistaId}:${revision}`}
              datos={datos}
              onReload={actualizar}
              onSaved={(d) => aplicar(d, 'Horarios guardados.')}
            />
            <section className={styles.surface}>
              <div className={styles.surfaceHeading}>
                <h2>Bloqueos de agenda</h2>
                {datos.puedeEditar && (
                  <button className={styles.secondaryButton} onClick={() => abrirEditor('NUEVO')}>
                    Agregar bloqueo
                  </button>
                )}
              </div>
              <div className={styles.surfaceBody}>
                <label className="form-check d-flex gap-2 align-items-center">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={pasados}
                    onChange={(e) => setPasados(e.target.checked)}
                  />
                  Mostrar bloqueos pasados
                </label>
              </div>
              {bloques.length ? (
                bloques.map((b) => (
                  <article className={styles.mobileItem} key={b.id}>
                    <strong>{b.motivo}</strong>
                    <p>
                      {mostrarFecha(b.desdeFecha, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {b.diaCompleto
                        ? b.desdeFecha === b.hastaFecha
                          ? ' · Día completo'
                          : ` — ${mostrarFecha(b.hastaFecha, { day: 'numeric', month: 'short', year: 'numeric' })} · Días completos`
                        : ` ${b.desdeHora} — ${mostrarFecha(b.hastaFecha, { day: 'numeric', month: 'short', year: 'numeric' })} ${b.hastaHora}`}
                    </p>
                    {datos.puedeEditar && (
                      <div className={styles.headerActions}>
                        <button className={styles.textButton} onClick={() => abrirEditor(b)}>
                          Editar {b.motivo}
                        </button>
                        <button className={styles.textButton} onClick={() => confirmarQuitar(b)}>
                          Quitar {b.motivo}
                        </button>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState titulo="No hay bloqueos en este período" />
              )}
            </section>
          </>
        )
      )}
      <Modal
        show={Boolean(editor)}
        centered
        scrollable
        fullscreen="sm-down"
        onHide={() => descartar(() => setEditor(null))}
      >
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            {editor === 'NUEVO' ? 'Nuevo bloqueo' : 'Editar bloqueo'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editor && datos && (
            <AvailabilityBlockForm
              datos={datos}
              bloqueo={editor === 'NUEVO' ? undefined : editor}
              onCancel={() => descartar(() => setEditor(null))}
              onSaved={(d) => aplicar(d, 'Bloqueo guardado.')}
            />
          )}
        </Modal.Body>
      </Modal>
      <Modal show={Boolean(eliminar)} centered onHide={() => setEliminar(null)}>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Quitar bloqueo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {eliminar && datos && (
            <PanelForm
              initialValues={{ version: datos.version }}
              validate={() => ({})}
              onSave={async (v) => {
                quitado.current = await quitarBloqueo(artistaId, eliminar.id, v.version);
              }}
              onSaved={() => {
                if (quitado.current) aplicar(quitado.current, 'Bloqueo quitado.');
              }}
            >
              <p>
                Se quitará «{eliminar.motivo}». Ese período volverá a estar disponible según los
                horarios de atención.
              </p>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEliminar(null)}
                >
                  Volver
                </button>
                <PanelSubmitButton pendingText="Quitando…">Quitar bloqueo</PanelSubmitButton>
              </div>
            </PanelForm>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
