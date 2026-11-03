'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '@/store/AuthProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import { PageHeader, EmptyState, StatusBadge } from './PanelUI';
import { PanelForm, PanelField } from './PanelForm';
import { fechaValida, relojEnZona } from '@/lib/agenda';
import { BookingEditor, AppointmentDetail, estados } from './BookingEditor';
import {
  cantidad,
  horaFin,
  inicioSemana,
  leerFecha,
  moneda,
  mostrarFecha,
  moverFecha,
} from '@/lib/panel-artista';
import { moverMes } from '@/lib/estadisticas-artista';
import { guardarZonaHoraria } from '@/services/citas.service';
import type { BandejaConsultas } from '@/types/consultas';
import type { CitaGuardada } from '@/types/citas';
import type { RecordatoriosPanel } from '@/types/recordatorios';
import styles from './workspace.module.css';
import agenda from './agenda.module.css';

const zonas = [
  ...new Set(['America/Argentina/Buenos_Aires', 'UTC', ...Intl.supportedValuesOf('timeZone')]),
];

export function AgendaWorkspace({ recordatorios }: { recordatorios: RecordatoriosPanel }) {
  const gestion = useConsultas();
  if (!gestion.datos)
    return (
      <>
        <PageHeader titulo="Agenda" />
        {gestion.cargando ? (
          <p role="status">Cargando agenda…</p>
        ) : (
          <p className="alert alert-danger" role="alert">
            {gestion.error}
            <button
              className={styles.textButton}
              onClick={() => {
                void gestion.recargar();
              }}
            >
              Reintentar
            </button>
          </p>
        )}
      </>
    );
  return <Agenda datos={gestion.datos} recordatorios={recordatorios} />;
}
function Agenda({
  datos,
  recordatorios,
}: {
  datos: BandejaConsultas;
  recordatorios: RecordatoriosPanel;
}) {
  const { usuario } = useAuth(),
    { params, update } = usePanelFilters(),
    confirm = useDiscardChanges();
  const { guardarCita, error, recargar } = useConsultas();
  const compacto = useMediaQuery('(max-width: 1200px)');
  const base = usuario?.rol === 'ESTUDIO_ADMIN' ? '/estudio' : '/artista';
  const hoy = relojEnZona(datos.contexto.zonaHoraria).fecha;
  const fecha = fechaValida(params.get('fecha')) ? params.get('fecha')! : hoy;
  const mes = params.get('rango') === 'mes',
    todos = params.get('rango') === 'todos',
    proximos = params.get('rango') === 'proximos';
  const vista =
    mes || todos || proximos
      ? 'LISTA'
      : params.get('vista') || (base === '/estudio' ? 'DIA' : 'SEMANA');
  const primera = mes
    ? `${fecha.slice(0, 7)}-01`
    : vista === 'DIA' || proximos
      ? fecha
      : inicioSemana(fecha);
  const ultima = mes
    ? moverFecha(`${moverMes(fecha.slice(0, 7), 1)}-01`, -1)
    : vista === 'DIA'
      ? fecha
      : moverFecha(primera, 6);
  const filtro = params.get('estado') || '',
    artista = params.get('artista') || '',
    cliente = params.get('cliente') || '',
    consulta = params.get('consulta') || '';
  const citas = datos.citas
    .filter(
      (c) =>
        (todos || (c.fecha >= primera && c.fecha <= ultima)) &&
        (!filtro || c.estado === filtro) &&
        (!artista || c.artistaId === artista) &&
        (!cliente || c.clienteId === cliente) &&
        (!consulta || c.solicitudId === consulta) &&
        (params.get('canceladas') === '1' || filtro === 'CANCELADA' || c.estado !== 'CANCELADA'),
    )
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const seleccionada = datos.citas.find((c) => c.id === params.get('cita'));
  const bloqueos = (datos.bloqueosAgenda || []).filter(
    (b) =>
      !filtro &&
      !cliente &&
      !consulta &&
      (!artista || b.artistaId === artista) &&
      (todos ||
        (b.desdeFecha <= ultima &&
          (b.diaCompleto || b.hastaHora !== '00:00'
            ? b.hastaFecha
            : moverFecha(b.hastaFecha, -1)) >= primera)),
  );
  const diasBloqueados = bloqueos.flatMap((b) => {
    const fin =
      b.diaCompleto || b.hastaHora !== '00:00' ? b.hastaFecha : moverFecha(b.hastaFecha, -1);
    const desde = todos ? b.desdeFecha : b.desdeFecha < primera ? primera : b.desdeFecha;
    const hasta = todos ? desde : fin > ultima ? ultima : fin;
    const dias: string[] = [];
    for (let dia = desde; dia <= hasta; dia = moverFecha(dia, 1)) dias.push(dia);
    return dias.map((dia) => ({ ...b, dia }));
  });
  function bloqueosDelDia(dia: string) {
    return diasBloqueados
      .filter((b) => b.dia === dia)
      .map((b) => (
        <Link
          key={b.id}
          className={agenda.block}
          href={`${base}/disponibilidad?artista=${b.artistaId}`}
        >
          <small>No disponible</small>
          <strong>{b.motivo}</strong>
          {todos && b.desdeFecha !== b.hastaFecha && (
            <span>
              {mostrarFecha(b.desdeFecha)} — {mostrarFecha(b.hastaFecha)}
            </span>
          )}
          <span>
            {b.diaCompleto
              ? 'Todo el día'
              : `${dia === b.desdeFecha ? b.desdeHora : '00:00'} — ${dia === b.hastaFecha ? b.hastaHora : '24:00'}`}
          </span>
          <span>{b.artistaNombre}</span>
        </Link>
      ));
  }
  const mostrarForm = Boolean(seleccionada) || params.has('nueva');
  const [aviso, setAviso] = useState(''),
    [zona, setZona] = useState(false);
  const puedeCrear = datos.contexto.administra || datos.contexto.puedeProponer;
  const cerrar = () => update({ cita: null, nueva: null, solicitud: null }, true);
  const nombreCliente = (id: string) =>
    datos.clientes.find((c) => c.id === id)?.nombre || 'Contacto';
  const cambiarDia = (paso: number) =>
    update({
      fecha: mes
        ? `${moverMes(fecha.slice(0, 7), paso)}-01`
        : moverFecha(fecha, paso * (vista === 'SEMANA' ? 7 : 1)),
      rango: todos ? null : params.get('rango'),
      cita: null,
    });
  function abrir(c: CitaGuardada) {
    update({ cita: c.id, nueva: null });
  }
  function listado() {
    const dias = [
      ...new Set([...citas.map((c) => c.fecha), ...diasBloqueados.map((b) => b.dia)]),
    ].sort();
    return dias.map((dia) => (
      <section key={dia}>
        <h2 className={agenda.listDay}>
          {dia === hoy ? 'Hoy' : mostrarFecha(dia, { weekday: 'long' })} · {mostrarFecha(dia)}
        </h2>
        {bloqueosDelDia(dia)}
        {citas
          .filter((c) => c.fecha === dia)
          .map((c) => (
            <article className={styles.mobileItem} key={c.id}>
              <button onClick={() => abrir(c)}>
                <div className={styles.mobileItemHeader}>
                  <strong>
                    {c.hora} — {horaFin(c.hora, c.duracion)}
                  </strong>
                  <StatusBadge estado={c.estado} />
                </div>
                <p>
                  <strong>{nombreCliente(c.clienteId)}</strong> · {c.artistaNombre}
                </p>
                <p>{c.titulo}</p>
                <small>{moneda(c.importe)} · Ver turno</small>
              </button>
            </article>
          ))}
      </section>
    ));
  }
  return (
    <>
      <PageHeader titulo={base === '/estudio' ? 'Agenda del equipo' : 'Agenda'}>
        <Link
          className={styles.secondaryButton}
          href={`${base}/disponibilidad${artista ? `?artista=${artista}` : ''}`}
        >
          Disponibilidad
        </Link>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            void recargar();
          }}
        >
          Actualizar
        </button>
        {puedeCrear && (
          <button
            className={styles.button}
            onClick={() => update({ nueva: '1', cita: null, solicitud: null })}
          >
            Agendar turno
          </button>
        )}
      </PageHeader>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <div className={styles.toolbar}>
        <div className={agenda.dateNavigation}>
          <button
            className={styles.secondaryButton}
            aria-label="Período anterior"
            onClick={() => cambiarDia(-1)}
          >
            ←
          </button>
          <label className={agenda.dateField}>
            <span className="visually-hidden">Fecha de agenda</span>
            <input
              type="date"
              aria-label="Fecha de agenda"
              value={fecha}
              onChange={(e) =>
                fechaValida(e.target.value) && update({ fecha: e.target.value, rango: null })
              }
            />
          </label>
          <button
            className={styles.secondaryButton}
            aria-label="Período siguiente"
            onClick={() => cambiarDia(1)}
          >
            →
          </button>
          <button className={styles.textButton} onClick={() => update({ fecha: hoy, rango: null })}>
            Hoy
          </button>
        </div>
        <div className={styles.tabs} aria-label="Vista de agenda">
          {[
            ['DIA', 'Día'],
            ['SEMANA', 'Semana'],
            ['LISTA', 'Lista'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={vista === key}
              className={vista === key ? styles.tabActive : ''}
              onClick={() => update({ vista: key!, rango: null })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.toolbar}>
        <div className={agenda.statusFilter}>
          <label>
            Estado{' '}
            <select value={filtro} onChange={(e) => update({ estado: e.target.value || null })}>
              <option value="">Todos</option>
              {Object.entries(estados).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {base === '/estudio' && (
            <label>
              Artista{' '}
              <select value={artista} onChange={(e) => update({ artista: e.target.value || null })}>
                <option value="">Todo el equipo</option>
                {datos.equipo.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="form-check d-flex gap-2 align-items-center m-0">
            <input
              className="form-check-input m-0"
              type="checkbox"
              checked={params.get('canceladas') === '1'}
              onChange={(e) => update({ canceladas: e.target.checked ? '1' : null })}
            />
            Mostrar cancelados
          </label>
        </div>
        <div className={agenda.zone}>
          <span>Horarios: {datos.contexto.zonaHoraria.replaceAll('_', ' ')}</span>
          {datos.contexto.administra && (
            <button className={styles.textButton} onClick={() => setZona(true)}>
              Cambiar zona
            </button>
          )}
        </div>
      </div>
      {(cliente || consulta || todos) && (
        <div className={styles.toolbar}>
          <span className={styles.muted}>
            {consulta
              ? datos.consultas.find((c) => c.id === consulta)?.titulo
              : cliente
                ? nombreCliente(cliente)
                : 'Todos los turnos'}
          </span>
          <button
            className={styles.textButton}
            onClick={() => update({ cliente: null, consulta: null, rango: null })}
          >
            Quitar filtro
          </button>
        </div>
      )}
      <p className={styles.muted}>
        {todos
          ? 'Todos los turnos'
          : primera === ultima
            ? mostrarFecha(primera, { weekday: 'long', day: 'numeric', month: 'long' })
            : `${mostrarFecha(primera)} — ${mostrarFecha(ultima)}`}{' '}
        · {cantidad(citas.length, 'turno')}
        {bloqueos.length > 0 && ` · ${cantidad(bloqueos.length, 'bloqueo')}`}
      </p>
      <section className={styles.surface} aria-label="Turnos">
        {!citas.length && !bloqueos.length ? (
          <EmptyState titulo="No hay turnos en este período" />
        ) : vista === 'SEMANA' && !compacto ? (
          <div className={agenda.calendarScroll}>
            <div className={agenda.week}>
              {Array.from({ length: 7 }, (_, i) => moverFecha(primera, i)).map((dia) => (
                <section className={agenda.day} key={dia}>
                  <header
                    className={`${agenda.dayHeading} ${dia === hoy ? agenda.currentDay : ''}`}
                  >
                    <span>{mostrarFecha(dia, { weekday: 'short' })}</span>
                    <strong>{leerFecha(dia).getDate()}</strong>
                  </header>
                  <div className={agenda.dayEvents}>
                    {bloqueosDelDia(dia)}
                    {citas
                      .filter((c) => c.fecha === dia)
                      .map((c) => (
                        <button
                          className={`${agenda.event} ${c.estado === 'PENDIENTE' ? agenda.pending : ''}`}
                          key={c.id}
                          onClick={() => abrir(c)}
                        >
                          <time>
                            {c.hora} — {horaFin(c.hora, c.duracion)}
                          </time>
                          <strong>{nombreCliente(c.clienteId)}</strong>
                          <span>{c.titulo}</span>
                          <span>{c.artistaNombre}</span>
                          <small>{estados[c.estado]}</small>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          listado()
        )}
      </section>
      <Modal
        show={mostrarForm}
        onHide={() => confirm(cerrar)}
        centered
        scrollable
        fullscreen="sm-down"
        size="lg"
      >
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            {seleccionada ? 'Turno' : 'Nuevo turno'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mostrarForm &&
            (seleccionada && !seleccionada.puedeEditar ? (
              <AppointmentDetail cita={seleccionada} datos={datos} base={base} />
            ) : (
              <BookingEditor
                key={seleccionada?.id || 'nuevo'}
                cita={seleccionada}
                datos={datos}
                recordatorios={recordatorios}
                solicitudId={params.get('solicitud') || ''}
                fecha={fecha}
                base={base}
                onCancel={() => confirm(cerrar)}
                onSave={(v) => guardarCita(v, seleccionada?.id)}
                onSaved={(cita) => {
                  setAviso(seleccionada ? 'Turno actualizado.' : 'Turno agendado.');
                  update({ cita: null, nueva: null, solicitud: null, fecha: cita.fecha }, true);
                }}
              />
            ))}
        </Modal.Body>
      </Modal>
      <Modal show={zona} onHide={() => confirm(() => setZona(false))} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Zona horaria de la agenda
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {zona && (
            <PanelForm
              initialValues={{ zonaHoraria: datos.contexto.zonaHoraria }}
              validate={() => ({})}
              onSave={async (v) => {
                await guardarZonaHoraria(v.zonaHoraria);
                await recargar();
              }}
              onSaved={() => {
                setZona(false);
                setAviso('Zona horaria actualizada.');
              }}
            >
              <PanelField name="zonaHoraria" label="Zona horaria" as="select">
                {zonas.map((z) => (
                  <option value={z} key={z}>
                    {z.replaceAll('_', ' ')}
                  </option>
                ))}
              </PanelField>
              <p className={styles.muted}>
                Los turnos se mostrarán en el horario de esta zona para todo el equipo.
              </p>
              <div className={styles.formActions}>
                <button type="submit" className={styles.button}>
                  Guardar zona
                </button>
              </div>
            </PanelForm>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
