'use client';

import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { useDiscardChanges, useUnsavedChanges } from '@/components/forms/UnsavedChanges';
import { PanelField, PanelForm } from './PanelForm';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import type { CitaPanel } from '@/types/panel-artista';
import type { ExcepcionesRecordatorios, RecordatoriosPanel } from '@/types/recordatorios';
import { Avatar, EmptyState, PageHeader, PanelIcon, SearchField } from './PanelUI';
import { cantidad, erroresCliente, fechaLocal, moneda, mostrarFecha } from '@/lib/panel-artista';
import type { ClientePanel } from '@/types/panel-artista';
import { ciudadesEjemplo } from '@/mocks/panel-artista';
import { PanelReminderOverrides } from './PanelReminderOverrides';
import styles from '@/components/panel/workspace.module.css';

export interface PanelClientsProps {
  baseRuta: string;
  datos: {
    clientes: ClientePanel[];
    citas: CitaPanel[];
    consultas: { id: string; clienteId: string; titulo: string }[];
    recordatorios: RecordatoriosPanel;
  };
  guardarCliente: (cliente: Omit<ClientePanel, 'id'>, id?: string) => string;
  abrirConversacion: (id: string) => string;
  guardarExcepcionesCliente: (id: string, valor: ExcepcionesRecordatorios) => void;
}
const ClientContext = createContext<PanelClientsProps | null>(null);
function useClientPanel() {
  const value = useContext(ClientContext);
  if (!value) throw new Error('Falta contexto de clientes.');
  return value;
}
export function PanelClients(props: PanelClientsProps) {
  return (
    <ClientContext.Provider value={props}>
      <Clients />
    </ClientContext.Provider>
  );
}
function Clients() {
  const { datos } = useClientPanel();
  const { params, update } = usePanelFilters();
  const confirmClose = useDiscardChanges();
  const busqueda = params.get('q') || '';
  const setBusqueda = (value: string) => update({ q: value || null }, true);
  const [formulario, setFormulario] = useState<{ cliente?: ClientePanel } | null>(null);
  const [aviso, setAviso] = useState('');
  const seleccionada = datos.clientes.find((cliente) => cliente.id === params.get('cliente'));
  const clientes = datos.clientes
    .filter((cliente) =>
      `${cliente.nombre} ${cliente.email} ${cliente.ciudad}`
        .toLocaleLowerCase('es')
        .includes(busqueda.toLocaleLowerCase('es')),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  function proximoTurno(clienteId: string) {
    const cita = datos.citas
      .filter(
        (cita) =>
          cita.clienteId === clienteId &&
          cita.fecha >= fechaLocal(new Date()) &&
          !['CANCELADA', 'COMPLETADA'].includes(cita.estado),
      )
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
    return cita ? mostrarFecha(cita.fecha) + ' · ' + cita.hora : 'Sin agendar';
  }
  function abrir(id?: string) {
    update({ cliente: id || null, editar: null });
  }
  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Contactos, proyectos y sesiones en un mismo lugar."
      >
        <button className={styles.button} onClick={() => setFormulario({})}>
          <PanelIcon nombre="mas" size={17} />
          Agregar cliente
        </button>
      </PageHeader>
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <div className={styles.toolbar}>
        <span className={styles.muted}>{cantidad(datos.clientes.length, 'cliente')}</span>
        <SearchField
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar nombre, email o ciudad"
        />
      </div>
      <section className={styles.surface} aria-label="Clientes">
        {clientes.length ? (
          <>
            <div className={styles.mobileList}>
              {clientes.map((cliente) => (
                <article className={styles.mobileItem} key={cliente.id}>
                  <button onClick={() => abrir(cliente.id)}>
                    <div className={styles.mobileItemHeader}>
                      <strong>{cliente.nombre}</strong>
                      <PanelIcon nombre="chevron" size={18} />
                    </div>
                    <p>{cliente.email}</p>
                    <small>{cliente.ciudad || 'Sin ubicación'}</small>
                    <p>Próximo turno: {proximoTurno(cliente.id)}</p>
                  </button>
                </article>
              ))}
            </div>
            <div className={`${styles.tableScroll} ${styles.desktopList}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Ubicación</th>
                    <th>Sesiones</th>
                    <th>Próxima sesión</th>
                    <th>
                      <span className="visually-hidden">Abrir ficha</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => {
                    const citas = datos.citas.filter(
                      (cita) => cita.clienteId === cliente.id && cita.estado !== 'CANCELADA',
                    );
                    const proxima = citas
                      .filter(
                        (cita) =>
                          cita.fecha >= fechaLocal(new Date()) && cita.estado !== 'COMPLETADA',
                      )
                      .sort((a, b) =>
                        `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`),
                      )[0];
                    return (
                      <tr key={cliente.id}>
                        <td>
                          <button
                            onClick={() => abrir(cliente.id)}
                            className={`${styles.identity} ${styles.rowLink}`}
                          >
                            <Avatar nombre={cliente.nombre} />
                            <span>
                              <strong>{cliente.nombre}</strong>
                              <small>{cliente.email}</small>
                            </span>
                          </button>
                        </td>
                        <td className={styles.muted}>{cliente.ciudad || 'Sin indicar'}</td>
                        <td className={styles.muted}>
                          {cantidad(
                            citas.filter((cita) => cita.estado === 'COMPLETADA').length,
                            'completada',
                          )}
                        </td>
                        <td className={styles.muted}>
                          {proxima
                            ? `${mostrarFecha(proxima.fecha)} · ${proxima.hora}`
                            : 'Sin agendar'}
                        </td>
                        <td>
                          <button
                            className={styles.textButton}
                            onClick={() => abrir(cliente.id)}
                            aria-label={`Ver ficha de ${cliente.nombre}`}
                          >
                            <PanelIcon nombre="chevron" size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            titulo={
              datos.clientes.length ? 'No encontramos ese cliente' : 'Todavía no tenés clientes'
            }
            detalle={
              datos.clientes.length
                ? 'Probá otro nombre, email o ciudad.'
                : 'Agregá tu primer contacto para coordinar un turno.'
            }
          />
        )}
      </section>
      <Offcanvas
        show={Boolean(seleccionada)}
        onHide={() => abrir()}
        placement="end"
        className={styles.detailDrawer}
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title as="h2">Ficha del cliente</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {seleccionada &&
            (params.get('editar') === '1' ? (
              <ClientForm
                key={seleccionada.id}
                cliente={seleccionada}
                onCancel={() => update({ editar: null }, true)}
                onSaved={() => {
                  update({ editar: null }, true);
                  setAviso('Cliente guardado.');
                }}
              />
            ) : (
              <ClientDetail
                key={seleccionada.id}
                cliente={seleccionada}
                onEdit={() => update({ editar: '1' })}
              />
            ))}
        </Offcanvas.Body>
      </Offcanvas>
      <Modal
        show={Boolean(formulario && !formulario.cliente)}
        onHide={() => confirmClose(() => setFormulario(null))}
        centered
        scrollable
        fullscreen="sm-down"
        className="artist-dialog"
      >
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            {formulario?.cliente ? 'Editar cliente' : 'Agregar cliente'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formulario && (
            <ClientForm
              key={formulario.cliente?.id || 'nuevo'}
              cliente={formulario.cliente}
              onCancel={() => confirmClose(() => setFormulario(null))}
              onSaved={() => {
                setFormulario(null);
                setAviso('Cliente guardado.');
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

function ClientDetail({ cliente, onEdit }: { cliente: ClientePanel; onEdit: () => void }) {
  const { datos, guardarCliente, abrirConversacion, guardarExcepcionesCliente, baseRuta } =
    useClientPanel();
  const router = useRouter();
  const [notas, setNotas] = useState(cliente.notas);
  const clearPendingNotes = useUnsavedChanges(notas.trim() !== cliente.notas);
  const confirmClose = useDiscardChanges();
  const [aviso, setAviso] = useState('');
  const citas = datos.citas
    .filter((item) => item.clienteId === cliente.id)
    .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`));
  const consultas = datos.consultas.filter((item) => item.clienteId === cliente.id);
  return (
    <>
      <div className={styles.detailHeader}>
        <Avatar nombre={cliente.nombre} grande />
        <button className={styles.textButton} onClick={onEdit}>
          Editar datos
        </button>
      </div>
      <h2 className={styles.detailTitle}>{cliente.nombre}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>Email</dt>
          <dd>{cliente.email}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{cliente.telefono || 'Sin indicar'}</dd>
        </div>
        <div>
          <dt>Ubicación</dt>
          <dd>{cliente.ciudad || 'Sin indicar'}</dd>
        </div>
        <div>
          <dt>Sesiones completadas</dt>
          <dd>{citas.filter((item) => item.estado === 'COMPLETADA').length}</dd>
        </div>
      </dl>
      <div className={styles.headerActions}>
        <Link href={`${baseRuta}/agenda?nueva=1&cliente=${cliente.id}`} className={styles.button}>
          <PanelIcon nombre="agenda" size={16} />
          Agendar
        </Link>
        <button
          className={styles.secondaryButton}
          onClick={() =>
            confirmClose(() => {
              clearPendingNotes();
              router.push(`${baseRuta}/mensajes?conversacion=${abrirConversacion(cliente.id)}`);
            })
          }
        >
          <PanelIcon nombre="mensajes" size={16} />
          Mensaje
        </button>
      </div>
      <h3 className={styles.miniTitle}>Sesiones</h3>
      {citas.length ? (
        citas.map((cita) => (
          <div className={styles.agendaItem} key={cita.id}>
            <time>{mostrarFecha(cita.fecha)}</time>
            <div>
              <h3>
                <Link href={`${baseRuta}/agenda?fecha=${cita.fecha}&cita=${cita.id}`}>
                  {cita.titulo}
                </Link>
              </h3>
              <p>
                {cita.hora} · {moneda(cita.importe)} ·{' '}
                {cita.estado === 'COMPLETADA'
                  ? 'Completada'
                  : cita.estado === 'CANCELADA'
                    ? 'Cancelada'
                    : 'Próxima sesión'}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className={styles.muted}>Todavía no hay sesiones.</p>
      )}
      <h3 className={styles.miniTitle}>Consultas</h3>
      {consultas.length ? (
        consultas.map((consulta) => (
          <p key={consulta.id}>
            <Link
              className={styles.textButton}
              href={`${baseRuta}/consultas?consulta=${consulta.id}`}
            >
              {consulta.titulo}
              <PanelIcon nombre="flecha" size={15} />
            </Link>
          </p>
        ))
      ) : (
        <p className={styles.muted}>Todavía no hay consultas.</p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const error = guardarCliente({ ...cliente, notas }, cliente.id);
          setAviso(error || 'Notas guardadas.');
          if (!error) setNotas(notas.trim());
        }}
      >
        <div className={styles.field}>
          <label htmlFor="client-notes" className="mt-3">
            Notas privadas
          </label>
          <textarea
            id="client-notes"
            maxLength={1000}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
          />
        </div>
        <button type="submit" className={styles.secondaryButton}>
          Guardar notas
        </button>
      </form>
      {aviso && (
        <p className={`${styles.notice} mt-3`} role="status">
          {aviso}
        </p>
      )}
      <PanelReminderOverrides
        datos={datos}
        baseRuta={baseRuta}
        value={cliente.recordatorios}
        clienteId={cliente.id}
        onChange={(valor) => guardarExcepcionesCliente(cliente.id, valor)}
      />
    </>
  );
}

function ClientForm({
  cliente,
  onCancel,
  onSaved,
}: {
  cliente?: ClientePanel;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { datos, guardarCliente } = useClientPanel();
  return (
    <PanelForm<Omit<ClientePanel, 'id'>>
      initialValues={cliente || { nombre: '', email: '', telefono: '', ciudad: '', notas: '' }}
      validate={(values) => erroresCliente(values, datos.clientes, cliente?.id)}
      onSave={(values) => guardarCliente(values, cliente?.id)}
      onSaved={onSaved}
    >
      <PanelField
        name="nombre"
        label="Nombre completo"
        minLength={2}
        maxLength={80}
        required
        autoComplete="name"
      />
      <PanelField
        name="email"
        label="Email"
        type="email"
        maxLength={254}
        required
        autoComplete="email"
      />
      <PanelField name="telefono" label="Teléfono" type="tel" maxLength={30} autoComplete="tel" />
      <PanelField name="ciudad" label="Ciudad" as="select">
        <option value="">Sin indicar</option>
        {ciudadesEjemplo.map((ciudad) => (
          <option key={ciudad} value={ciudad}>
            {ciudad}
          </option>
        ))}
      </PanelField>
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.secondaryButton}>
          Cancelar
        </button>
        <button type="submit" className={styles.button}>
          Guardar cliente
        </button>
      </div>
    </PanelForm>
  );
}
