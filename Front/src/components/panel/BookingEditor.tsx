'use client';
import { useRef } from 'react';
import Link from 'next/link';
import Accordion from 'react-bootstrap/Accordion';
import { useFormikContext } from 'formik';
import { PanelForm, PanelField } from './PanelForm';
import { PanelReminderOverrides } from './PanelReminderOverrides';
import { StatusBadge } from './PanelUI';
import { crearFormularioCita, erroresFormularioCita, relojEnZona } from '@/lib/agenda';
import { moneda, mostrarFecha } from '@/lib/panel-artista';
import type { BandejaConsultas } from '@/types/consultas';
import type { CitaGuardada, FormularioCita } from '@/types/citas';
import type { RecordatoriosPanel } from '@/types/recordatorios';
import styles from './workspace.module.css';
export const estados = {
  PENDIENTE: 'Por confirmar',
  CONFIRMADA: 'Confirmada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};
export function BookingEditor({
  cita,
  datos,
  recordatorios,
  solicitudId,
  fecha,
  base,
  onCancel,
  onSave,
  onSaved,
}: {
  cita?: CitaGuardada;
  datos: BandejaConsultas;
  recordatorios: RecordatoriosPanel;
  solicitudId: string;
  fecha: string;
  base: string;
  onCancel: () => void;
  onSave: (v: FormularioCita) => Promise<CitaGuardada>;
  onSaved: (c: CitaGuardada) => void;
}) {
  const guardada = useRef<CitaGuardada | null>(null);
  return (
    <PanelForm<FormularioCita>
      initialValues={crearFormularioCita(datos, solicitudId, fecha, cita)}
      validate={(v) => erroresFormularioCita(v, datos, cita?.id)}
      onSave={async (v) => {
        guardada.current = await onSave(v);
      }}
      onSaved={() => {
        if (guardada.current) onSaved(guardada.current);
      }}
    >
      <BookingFields datos={datos} cita={cita} base={base} recordatorios={recordatorios} />
      <div className={styles.formActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Volver
        </button>
        <button type="submit" className={styles.button}>
          Guardar turno
        </button>
      </div>
    </PanelForm>
  );
}
function BookingFields({
  datos,
  cita,
  base,
  recordatorios,
}: {
  datos: BandejaConsultas;
  cita?: CitaGuardada;
  base: string;
  recordatorios: RecordatoriosPanel;
}) {
  const { values, setValues, setFieldValue, setFieldTouched, errors, touched, submitCount } =
    useFormikContext<FormularioCita>();
  const c = datos.consultas.find((s) => s.id === values.solicitudId);
  const elegibles = datos.consultas.filter(
    (s) =>
      s.estado === 'ASIGNADA' &&
      s.artistaId &&
      (datos.contexto.administra || s.artistaId === datos.contexto.usuarioId) &&
      datos.equipo.some((a) => a.id === s.artistaId && a.estado === 'ACTIVO'),
  );
  const puedeCompletar = Boolean(
    cita?.estado === 'CONFIRMADA' &&
    cita.fecha + cita.hora <=
      relojEnZona(datos.contexto.zonaHoraria).fecha + relojEnZona(datos.contexto.zonaHoraria).hora,
  );
  return (
    <>
      {!cita ? (
        <div className={styles.field}>
          <label htmlFor="booking-request">Consulta asignada</label>
          <select
            id="booking-request"
            value={values.solicitudId}
            onChange={(e) => {
              const inicial = crearFormularioCita(datos, e.target.value, values.fecha);
              void setValues({
                ...inicial,
                hora: values.hora,
                duracion: values.duracion,
                estado: values.estado,
                claveCreacion: values.claveCreacion,
              });
            }}
            onBlur={() => {
              void setFieldTouched('solicitudId', true);
            }}
            aria-invalid={
              Boolean(errors.solicitudId && (touched.solicitudId || submitCount)) || undefined
            }
            aria-describedby={errors.solicitudId ? 'booking-request-error' : undefined}
          >
            <option value="">Seleccionar consulta</option>
            {elegibles.map((s) => (
              <option value={s.id} key={s.id}>
                {s.titulo} · {datos.clientes.find((cl) => cl.id === s.clienteId)?.nombre}
              </option>
            ))}
          </select>
          <RequestError />
        </div>
      ) : (
        <p>
          <Link
            className={styles.textButton}
            href={`${base}/consultas?consulta=${cita.solicitudId}`}
          >
            Ver consulta y propuesta
          </Link>
        </p>
      )}
      {c && (
        <dl className={styles.facts}>
          <div>
            <dt>Cliente</dt>
            <dd>{datos.clientes.find((cl) => cl.id === c.clienteId)?.nombre}</dd>
          </div>
          <div>
            <dt>Artista</dt>
            <dd>{cita?.artistaNombre || datos.equipo.find((a) => a.id === c.artistaId)?.nombre}</dd>
          </div>
        </dl>
      )}
      {!cita && !elegibles.length && (
        <p className={styles.notice}>
          Primero asigná un artista desde <Link href={`${base}/consultas`}>Consultas</Link>.
        </p>
      )}
      <PanelField name="titulo" label="Trabajo" required minLength={3} maxLength={100} />
      <div className={styles.formGrid}>
        <PanelField name="fecha" label="Fecha" type="date" required />
        <PanelField name="hora" label="Hora" type="time" required />
        <PanelField
          name="duracion"
          label="Duración (minutos)"
          type="number"
          min={30}
          max={480}
          required
        />
        <PanelField name="estado" label="Estado" as="select">
          {Object.entries(estados).map(([key, label]) => (
            <option
              value={key}
              key={key}
              disabled={
                (!cita && ['COMPLETADA', 'CANCELADA'].includes(key)) ||
                (key === 'COMPLETADA' && !puedeCompletar)
              }
            >
              {label}
            </option>
          ))}
        </PanelField>
      </div>
      <Accordion className={styles.formSection}>
        <Accordion.Item eventKey="0">
          <Accordion.Header>Importes, notas y recordatorios</Accordion.Header>
          <Accordion.Body>
            <div className={styles.formGrid}>
              <PanelField
                name="importe"
                label="Importe de esta sesión (ARS)"
                type="number"
                min={0}
                max={100000000}
                step="0.01"
                required
              />
              <PanelField
                name="sena"
                label="Seña acordada (ARS)"
                type="number"
                min={0}
                max={100000000}
                step="0.01"
              />
            </div>
            <PanelField name="notas" label="Notas privadas" as="textarea" maxLength={1000} />
            <PanelReminderOverrides
              datos={{ ...datos, recordatorios }}
              baseRuta={base}
              clienteId={c?.clienteId}
              porTurno
              cancelado={values.estado === 'CANCELADA'}
              value={values.recordatorios}
              onChange={(v) => {
                void setFieldValue('recordatorios', v);
              }}
            />
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
function RequestError() {
  const { errors, touched, submitCount } = useFormikContext<FormularioCita>();
  return errors.solicitudId && (touched.solicitudId || submitCount) ? (
    <small id="booking-request-error" className="text-danger" role="alert">
      {errors.solicitudId}
    </small>
  ) : null;
}
export function AppointmentDetail({
  cita: c,
  datos,
  base,
}: {
  cita: CitaGuardada;
  datos: BandejaConsultas;
  base: string;
}) {
  return (
    <>
      <StatusBadge estado={c.estado} />
      <h2 className={styles.detailTitle}>{c.titulo}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>Cliente</dt>
          <dd>{datos.clientes.find((cl) => cl.id === c.clienteId)?.nombre}</dd>
        </div>
        <div>
          <dt>Artista</dt>
          <dd>{c.artistaNombre}</dd>
        </div>
        <div>
          <dt>Fecha y hora</dt>
          <dd>
            {mostrarFecha(c.fecha)} · {c.hora}
          </dd>
        </div>
        <div>
          <dt>Importe</dt>
          <dd>{moneda(c.importe)}</dd>
        </div>
      </dl>
      {c.notas && <p className={styles.description}>{c.notas}</p>}
      <Link className={styles.secondaryButton} href={`${base}/consultas?consulta=${c.solicitudId}`}>
        Ver consulta
      </Link>
    </>
  );
}
