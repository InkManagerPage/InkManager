'use client';

import { createContext, useContext, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/store/AuthProvider';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { useConsultas } from '@/hooks/useConsultas';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { useDiscardChanges, useUnsavedChanges } from '@/components/forms/UnsavedChanges';
import { PageHeader, EmptyState, SearchField, Avatar } from './PanelUI';
import { PanelForm, PanelField } from './PanelForm';
import { PhotoField } from '@/app/artista/_components/PhotoField';
import {
  cantidad,
  erroresPresupuesto,
  fechaLocal,
  moneda,
  mostrarFecha,
  moverFecha,
} from '@/lib/panel-artista';
import { estadosConsultaEstudio } from '@/lib/panel-estudio';
import { nombreCanal } from '@/lib/canales-consulta';
import type { ConsultaGuardada } from '@/types/consultas';
import type { PresupuestoPanel } from '@/types/panel-artista';
import styles from './workspace.module.css';
import ui from './consultations.module.css';

const Context = createContext<ReturnType<typeof useConsultas> | null>(null);
function useWorkspace() {
  const context = useContext(Context);
  if (!context?.datos) throw new Error('Falta la bandeja de consultas.');
  return { ...context, datos: context.datos };
}
export function ConsultationsWorkspace() {
  const consultas = useConsultas();
  if (consultas.cargando && !consultas.datos)
    return (
      <section aria-busy="true">
        <PageHeader titulo="Consultas" />
        <p role="status">Cargando consultas…</p>
      </section>
    );
  if (!consultas.datos)
    return (
      <>
        <PageHeader titulo="Consultas" />
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {consultas.error}
        </p>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            void consultas.recargar();
          }}
        >
          Reintentar
        </button>
      </>
    );
  return (
    <Context.Provider value={consultas}>
      <QueryList />
    </Context.Provider>
  );
}
function QueryList() {
  const { datos, error, recargar } = useWorkspace();
  const { params, update } = usePanelFilters();
  const confirm = useDiscardChanges();
  const q = params.get('q') || '',
    estado = params.get('estado') || '';
  const seleccionada = datos.consultas.find((c) => c.id === params.get('consulta'));
  const cliente = (id: string) => datos.clientes.find((c) => c.id === id)?.nombre || 'Contacto';
  const lista = datos.consultas.filter(
    (c) =>
      (!estado || c.estado === estado) &&
      (!params.get('cliente') || c.clienteId === params.get('cliente')) &&
      (!params.get('artista') ||
        c.artistaId === params.get('artista') ||
        c.propuestas.some((p) => p.artistaId === params.get('artista'))) &&
      `${c.titulo} ${cliente(c.clienteId)}`
        .toLocaleLowerCase('es')
        .includes(q.toLocaleLowerCase('es')),
  );
  return (
    <>
      <PageHeader
        titulo="Consultas"
        descripcion={
          datos.contexto.tipo === 'ESTUDIO' ? datos.contexto.nombre : 'Tus proyectos y propuestas.'
        }
      >
        <button
          className={styles.secondaryButton}
          onClick={() => {
            void recargar();
          }}
        >
          Actualizar
        </button>
      </PageHeader>
      {error && (
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}
        </p>
      )}
      <div className={styles.toolbar}>
        <div className={ui.filters}>
          <label>
            Estado
            <select value={estado} onChange={(e) => update({ estado: e.target.value || null })}>
              <option value="">Todos</option>
              {Object.entries(estadosConsultaEstudio).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span className={styles.muted}>{cantidad(lista.length, 'consulta')}</span>
        </div>
        <SearchField
          value={q}
          onChange={(q) => update({ q: q || null }, true)}
          placeholder="Buscar proyecto o cliente"
        />
      </div>
      {(params.has('cliente') || params.has('artista')) && (
        <div className={styles.toolbar}>
          <span className={styles.muted}>
            {params.has('cliente')
              ? `Cliente: ${cliente(params.get('cliente')!)}`
              : `Artista: ${datos.equipo.find((a) => a.id === params.get('artista'))?.nombre || 'seleccionado'}`}
          </span>
          <button
            className={styles.textButton}
            onClick={() => update({ cliente: null, artista: null })}
          >
            Quitar filtro
          </button>
        </div>
      )}
      <section className={styles.surface} aria-label="Consultas">
        {lista.length ? (
          <>
            <div className={styles.desktopList}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Proyecto / cliente</th>
                      <th scope="col">Canal</th>
                      <th scope="col">Estado</th>
                      <th scope="col">
                        {datos.contexto.administra ? 'Propuestas' : 'Mi propuesta'}
                      </th>
                      <th scope="col">Artista</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <button
                            className={styles.rowLink}
                            onClick={() => update({ consulta: c.id })}
                          >
                            <strong>{c.titulo}</strong>
                            <div className={styles.muted}>{cliente(c.clienteId)}</div>
                          </button>
                        </td>
                        <td>{nombreCanal(c.canal)}</td>
                        <td>
                          <QueryStatus consulta={c} />
                        </td>
                        <td>{c.propuestas.length}</td>
                        <td>{datos.equipo.find((a) => a.id === c.artistaId)?.nombre || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.mobileList}>
              {lista.map((c) => (
                <article className={styles.mobileItem} key={c.id}>
                  <button onClick={() => update({ consulta: c.id })}>
                    <div className={styles.mobileItemHeader}>
                      <strong>{c.titulo}</strong>
                    </div>
                    <p>
                      {cliente(c.clienteId)} · {nombreCanal(c.canal)}
                    </p>
                    <QueryStatus consulta={c} />
                    <p>{cantidad(c.propuestas.length, 'propuesta')}</p>
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            titulo={
              datos.consultas.length
                ? 'No hay consultas con estos filtros'
                : 'Todavía no hay consultas'
            }
          >
            {datos.consultas.length > 0 && (
              <button
                className={styles.textButton}
                onClick={() => update({ q: null, estado: null, cliente: null, artista: null })}
              >
                Limpiar filtros
              </button>
            )}
          </EmptyState>
        )}
      </section>
      <Offcanvas
        show={Boolean(seleccionada)}
        onHide={() => confirm(() => update({ consulta: null }))}
        placement="end"
        className={styles.detailDrawer}
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title as="h2">Detalle de consulta</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {seleccionada && <QueryDetail key={seleccionada.id} consulta={seleccionada} />}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
function QueryStatus({ consulta }: { consulta: ConsultaGuardada }) {
  return (
    <span
      className={`${styles.status} ${consulta.estado === 'ASIGNADA' ? styles.statusGood : consulta.estado === 'POR_ASIGNAR' ? styles.statusPending : styles.statusMuted}`}
    >
      {estadosConsultaEstudio[consulta.estado]}
    </span>
  );
}
function QueryDetail({ consulta: c }: { consulta: ConsultaGuardada }) {
  const { datos, cambiar } = useWorkspace();
  const { usuario } = useAuth();
  const [accion, setAccion] = useState<'CERRAR' | 'ARCHIVAR' | null>(null),
    [editando, setEditando] = useState(false),
    [imagen, setImagen] = useState(''),
    [guardando, setGuardando] = useState(false),
    [error, setError] = useState(''),
    [aviso, setAviso] = useState('');
  const confirm = useDiscardChanges();
  const ctx = datos.contexto;
  const cliente = datos.clientes.find((x) => x.id === c.clienteId);
  const nombreArtista = (id: string | null) =>
    datos.equipo.find((a) => a.id === id)?.nombre || 'Sin asignar';
  const propia = c.propuestas.find((p) => p.artistaId === ctx.usuarioId);
  const base = usuario?.rol === 'ESTUDIO_ADMIN' ? '/estudio' : '/artista';
  const turnos = datos.citas.filter((t) => t.solicitudId === c.id);
  const puedeAgendar =
    c.estado === 'ASIGNADA' &&
    (ctx.administra || (ctx.puedeProponer && c.artistaId === ctx.usuarioId)) &&
    datos.equipo.some((a) => a.id === c.artistaId && a.estado === 'ACTIVO');
  return (
    <>
      <QueryStatus consulta={c} />
      <h2 className={styles.detailTitle}>{c.titulo}</h2>
      <div className={styles.identity}>
        <Avatar nombre={cliente?.nombre || 'Contacto'} />
        <div>
          <strong>{cliente?.nombre || 'Contacto'}</strong>
          <small>
            {nombreCanal(c.canal)} · {mostrarFecha(c.fecha)}
          </small>
        </div>
      </div>
      <p className={`${styles.description} mt-4`}>{c.descripcion}</p>
      <dl className={styles.facts}>
        <div>
          <dt>Estilo y color</dt>
          <dd>
            {c.estilo} · {c.color}
          </dd>
        </div>
        <div>
          <dt>Ubicación y tamaño</dt>
          <dd>
            {c.zona} · {c.tamano}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{cliente?.email || 'Sin indicar'}</dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>{cliente?.telefono || 'Sin indicar'}</dd>
        </div>
        <div>
          <dt>Artista asignado</dt>
          <dd>{nombreArtista(c.artistaId)}</dd>
        </div>
        <div>
          <dt>Recepción de propuestas</dt>
          <dd>
            {c.cerradaEn
              ? `Cerrada el ${mostrarFecha(c.cerradaEn)}`
              : c.cierre
                ? `Hasta ${mostrarFecha(c.cierre, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : 'Cierre manual'}
          </dd>
        </div>
      </dl>
      {(puedeAgendar || turnos.length > 0) && (
        <div className={styles.headerActions}>
          {puedeAgendar && (
            <Link className={styles.button} href={`${base}/agenda?nueva=1&solicitud=${c.id}`}>
              {turnos.some((t) => t.estado !== 'CANCELADA') ? 'Agregar sesión' : 'Agendar turno'}
            </Link>
          )}
          {turnos.length > 0 && (
            <Link
              className={styles.secondaryButton}
              href={`${base}/agenda?consulta=${c.id}&rango=todos&vista=LISTA&canceladas=1`}
            >
              Ver turnos ({turnos.length})
            </Link>
          )}
        </div>
      )}
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      {c.referencias.length > 0 && (
        <div className={ui.references}>
          {c.referencias.map((url, i) => (
            <button
              key={`${url}-${i}`}
              aria-label={`Ver referencia ${i + 1}`}
              onClick={() => setImagen(url)}
            >
              <Image src={url} alt={`Referencia ${i + 1} del proyecto`} width={160} height={120} />
            </button>
          ))}
        </div>
      )}
      {ctx.puedeProponer && c.estado === 'ABIERTA' && (
        <button
          className={`${styles.button} mt-4`}
          onClick={() => confirm(() => setEditando(true))}
        >
          {propia ? 'Editar mi propuesta' : 'Presentar propuesta'}
        </button>
      )}
      <h2 className={styles.miniTitle}>
        {ctx.administra ? cantidad(c.propuestas.length, 'propuesta') : 'Mi propuesta'}
      </h2>
      {c.propuestas.map((p) => (
        <article className={ui.proposal} key={p.id}>
          <h3>{nombreArtista(p.artistaId)}</h3>
          <strong>{moneda(p.importe)}</strong>
          <p>
            Seña: {moneda(p.sena)}
            {p.validez ? ` · Válido hasta ${mostrarFecha(p.validez)}` : ''}
          </p>
          <p>{p.detalle}</p>
          {p.boceto && (
            <button className={styles.textButton} onClick={() => setImagen(p.boceto)}>
              Ver boceto
            </button>
          )}
        </article>
      ))}
      {!c.propuestas.length && (
        <p className={styles.muted}>
          {ctx.administra ? 'Todavía no hay propuestas.' : 'Todavía no presentaste una propuesta.'}
        </p>
      )}
      {ctx.administra && c.estado === 'ABIERTA' && (
        <section className="mt-4">
          <PanelForm
            initialValues={{ cierre: c.cierre ? fechaHoraLocal(c.cierre) : '' }}
            validate={(v) =>
              v.cierre &&
              (!Number.isFinite(Date.parse(v.cierre)) || Date.parse(v.cierre) <= Date.now())
                ? { cierre: 'Elegí una fecha futura.' }
                : {}
            }
            onSave={async (v) => {
              await cambiar(c.id, {
                accion: 'CIERRE',
                version: c.version,
                cierre: v.cierre ? new Date(v.cierre).toISOString() : null,
              });
              setAviso('Cierre actualizado.');
            }}
          >
            <PanelField
              name="cierre"
              label="Fecha de cierre"
              type="datetime-local"
              hint="Vacío: cierre manual."
            />
            <button className={styles.secondaryButton} type="submit">
              Guardar cierre
            </button>
          </PanelForm>
          <button
            className={`${styles.button} mt-3`}
            onClick={() =>
              confirm(() => {
                setError('');
                setAccion('CERRAR');
              })
            }
          >
            Cerrar recepción de propuestas
          </button>
        </section>
      )}
      {ctx.administra && c.estado !== 'ARCHIVADA' && (
        <section className="mt-4">
          <h2 className={styles.miniTitle}>{c.artistaId ? 'Reasignar consulta' : 'Asignación'}</h2>
          <PanelForm
            initialValues={{ artistaId: c.artistaId || '' }}
            validate={(v) =>
              !datos.equipo.some((a) => a.id === v.artistaId && a.estado === 'ACTIVO')
                ? { artistaId: 'Elegí un artista activo.' }
                : {}
            }
            onSave={async (v) => {
              await cambiar(c.id, {
                accion: 'ASIGNAR',
                version: c.version,
                artistaId: v.artistaId,
              });
              setAviso('Artista asignado.');
            }}
          >
            <PanelField name="artistaId" label="Artista" as="select" required>
              <option value="">Seleccionar</option>
              {datos.equipo
                .filter((a) => a.estado === 'ACTIVO')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
            </PanelField>
            <button className={styles.button} type="submit">
              Confirmar asignación
            </button>
          </PanelForm>
          <button
            className={`${styles.textButton} mt-4`}
            onClick={() =>
              confirm(() => {
                setError('');
                setAccion('ARCHIVAR');
              })
            }
          >
            Archivar consulta
          </button>
        </section>
      )}
      <Modal show={Boolean(accion)} onHide={() => !guardando && setAccion(null)} centered>
        <Modal.Header closeButton={!guardando} closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            {accion === 'CERRAR' ? '¿Cerrar las propuestas?' : '¿Archivar consulta?'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {accion === 'CERRAR'
              ? 'Una propuesta vigente asigna su artista; varias quedan a elección del cliente. Sin propuestas, tendrás que asignar un artista.'
              : 'Se conservarán la consulta y sus propuestas en el historial.'}
          </p>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          <div className={styles.formActions}>
            <button
              disabled={guardando}
              className={styles.secondaryButton}
              onClick={() => setAccion(null)}
            >
              Volver
            </button>
            <button
              disabled={guardando}
              className={styles.button}
              onClick={async () => {
                setGuardando(true);
                setError('');
                try {
                  await cambiar(c.id, { accion, version: c.version });
                  setAccion(null);
                  setAviso(accion === 'CERRAR' ? 'Recepción cerrada.' : 'Consulta archivada.');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'No pudimos guardar los cambios.');
                } finally {
                  setGuardando(false);
                }
              }}
            >
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
      <Modal show={editando} onHide={() => confirm(() => setEditando(false))} centered scrollable>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Tu propuesta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editando && (
            <QuoteEditor
              consulta={c}
              onSaved={() => {
                setEditando(false);
                setAviso('Propuesta guardada.');
              }}
            />
          )}
        </Modal.Body>
      </Modal>
      <Modal show={Boolean(imagen)} onHide={() => setImagen('')} size="lg" centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Imagen del proyecto
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {imagen && (
            <Image
              src={imagen}
              alt={`Imagen de ${c.titulo}`}
              width={900}
              height={900}
              className={ui.fullImage}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
function QuoteEditor({ consulta, onSaved }: { consulta: ConsultaGuardada; onSaved: () => void }) {
  const { datos, proponer } = useWorkspace();
  const [version] = useState(consulta.version),
    [imagen, setImagen] = useState<File | null>(null),
    [procesando, setProcesando] = useState(false);
  useUnsavedChanges(Boolean(imagen));
  const propia = consulta.propuestas.find((p) => p.artistaId === datos.contexto.usuarioId);
  return (
    <PanelForm<PresupuestoPanel>
      initialValues={
        propia || {
          importe: 0,
          sena: 0,
          detalle: '',
          validez: moverFecha(fechaLocal(new Date()), 14),
        }
      }
      validate={erroresPresupuesto}
      onSave={async (v) => {
        if (procesando) return 'Esperá a que termine de optimizarse la imagen.';
        await proponer(consulta.id, v, version, imagen);
      }}
      onSaved={onSaved}
    >
      <div className={styles.formGrid}>
        <PanelField
          name="importe"
          label="Importe (ARS)"
          type="number"
          min={1}
          max={100000000}
          step="0.01"
          required
        />
        <PanelField
          name="sena"
          label="Seña (ARS)"
          type="number"
          min={0}
          max={100000000}
          step="0.01"
        />
      </div>
      <PanelField
        name="detalle"
        label="Detalle"
        as="textarea"
        required
        minLength={10}
        maxLength={1200}
      />
      <PanelField name="validez" label="Válido hasta" type="date" required />
      <PhotoField
        id="quote-image"
        label="Boceto"
        actual={propia?.boceto}
        onChange={setImagen}
        onProcessing={setProcesando}
      />
      <div className={styles.formActions}>
        <button className={styles.button} type="submit" disabled={procesando}>
          Guardar propuesta
        </button>
      </div>
    </PanelForm>
  );
}
function fechaHoraLocal(valor: string) {
  const d = new Date(valor);
  return `${fechaLocal(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
