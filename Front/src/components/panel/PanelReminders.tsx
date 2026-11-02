'use client';

import { createContext, useContext, useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import type { CitaPanel, ClientePanel } from '@/types/panel-artista';

import { PageHeader, PanelIcon } from './PanelUI';
import {
  describirRegla,
  diasSemana,
  recordatoriosArtista,
  recordatoriosCliente,
  reemplazarVariables,
  erroresReglaCorreo,
  variablesCorreo,
} from '@/lib/recordatorios';
import { fechaLocal, mostrarFecha, moverFecha } from '@/lib/panel-artista';
import type { RecordatoriosPanel, ReglaCorreo, TipoRecordatorio } from '@/types/recordatorios';
import styles from '@/components/panel/workspace.module.css';
import mail from './reminders.module.css';
import { useFormikContext } from 'formik';
import { PanelField, PanelForm } from './PanelForm';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';

const zonasHorarias = [
  ...new Set(['America/Argentina/Buenos_Aires', ...Intl.supportedValuesOf('timeZone')]),
];

export interface PanelRemindersProps {
  datos: { recordatorios: RecordatoriosPanel; citas: CitaPanel[]; consultas: unknown[] };
  nombre: string;
  buscarCliente: (id: string) => ClientePanel;
  guardarRecordatorios: (valor: RecordatoriosPanel) => string;
}
const ReminderContext = createContext<PanelRemindersProps | null>(null);
function useReminderPanel() {
  const value = useContext(ReminderContext);
  if (!value) throw new Error('Falta contexto de recordatorios.');
  return value;
}
export function PanelReminders(props: PanelRemindersProps) {
  return (
    <ReminderContext.Provider value={props}>
      <Reminders />
    </ReminderContext.Provider>
  );
}
function Reminders() {
  const { datos, guardarRecordatorios } = useReminderPanel();
  const [editando, setEditando] = useState<TipoRecordatorio | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const config = datos.recordatorios;
  const confirmClose = useDiscardChanges();
  function guardar(siguiente: RecordatoriosPanel) {
    const fallo = guardarRecordatorios(siguiente);
    setError(fallo);
    if (!fallo) setAviso('Configuración de recordatorios actualizada.');
    return fallo;
  }
  const titulo = [...recordatoriosCliente, ...recordatoriosArtista].find(
    (item) => item.id === editando,
  )?.titulo;
  return (
    <>
      <PageHeader
        titulo="Recordatorios"
        descripcion="Turnos, seguimiento y resúmenes de actividad."
      />
      {error && (
        <p className={`${styles.notice} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <div className={mail.timezone}>
        <PanelIcon nombre="reloj" size={18} />
        <label htmlFor="reminder-timezone">Zona horaria</label>
        <select
          id="reminder-timezone"
          value={config.zonaHoraria}
          onChange={(event) => guardar({ ...config, zonaHoraria: event.target.value })}
        >
          {zonasHorarias.map((zona) => (
            <option value={zona} key={zona}>
              {zona.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.stack}>
        <section className={styles.surface} aria-labelledby="client-reminders">
          <div className={styles.surfaceHeading}>
            <div>
              <h2 id="client-reminders">Correos para tus clientes</h2>
              <p className={mail.groupDescription}>
                Turnos, cuidados y seguimiento después de cada sesión.
              </p>
            </div>
            <label className={mail.groupSwitch}>
              <span>{config.clientesHabilitados ? 'Activados' : 'Desactivados'}</span>
              <span className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  aria-label="Correos para clientes"
                  checked={config.clientesHabilitados}
                  onChange={(event) =>
                    guardar({ ...config, clientesHabilitados: event.target.checked })
                  }
                />
              </span>
            </label>
          </div>
          {recordatoriosCliente.map((item) => (
            <ReminderRow
              key={item.id}
              titulo={item.titulo}
              descripcion={item.descripcion}
              tipo={item.id}
              regla={config.reglas[item.id]}
              habilitado={config.clientesHabilitados}
              onToggle={() =>
                guardar({
                  ...config,
                  reglas: {
                    ...config.reglas,
                    [item.id]: {
                      ...config.reglas[item.id],
                      activo: !config.reglas[item.id].activo,
                    },
                  },
                })
              }
              onEdit={() => setEditando(item.id)}
            />
          ))}
          <div className={styles.sectionFoot}>
            <span>
              Podés establecer excepciones desde la ficha del cliente o al editar un turno.
            </span>
          </div>
        </section>
        <section className={styles.surface} aria-labelledby="artist-reminders">
          <div className={styles.surfaceHeading}>
            <div>
              <h2 id="artist-reminders">Correos para vos</h2>
              <p className={mail.groupDescription}>
                Tu agenda y un resumen de cómo viene tu trabajo.
              </p>
            </div>
            <label className={mail.groupSwitch}>
              <span>{config.artistaHabilitado ? 'Activados' : 'Desactivados'}</span>
              <span className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  aria-label="Correos para el artista"
                  checked={config.artistaHabilitado}
                  onChange={(event) =>
                    guardar({ ...config, artistaHabilitado: event.target.checked })
                  }
                />
              </span>
            </label>
          </div>
          {recordatoriosArtista.map((item) => (
            <ReminderRow
              key={item.id}
              titulo={item.titulo}
              descripcion={item.descripcion}
              tipo={item.id}
              regla={config.reglas[item.id]}
              habilitado={config.artistaHabilitado}
              onToggle={() =>
                guardar({
                  ...config,
                  reglas: {
                    ...config.reglas,
                    [item.id]: {
                      ...config.reglas[item.id],
                      activo: !config.reglas[item.id].activo,
                    },
                  },
                })
              }
              onEdit={() => setEditando(item.id)}
            />
          ))}
        </section>
      </div>
      <Offcanvas
        show={Boolean(editando)}
        onHide={() => confirmClose(() => setEditando(null))}
        placement="end"
        className={styles.detailDrawer}
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title as="h2">{titulo}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {editando && (
            <ReminderEditor
              key={editando}
              tipo={editando}
              inicial={config.reglas[editando]}
              onCancel={() => confirmClose(() => setEditando(null))}
              onSave={(regla) => {
                const fallo = guardar({
                  ...config,
                  reglas: { ...config.reglas, [editando]: regla },
                });
                if (!fallo) setEditando(null);
                return fallo;
              }}
            />
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

function ReminderRow({
  titulo,
  descripcion,
  tipo,
  regla,
  habilitado,
  onToggle,
  onEdit,
}: {
  titulo: string;
  descripcion: string;
  tipo: TipoRecordatorio;
  regla: ReglaCorreo;
  habilitado: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={`${mail.ruleRow} ${!habilitado || !regla.activo ? mail.ruleDisabled : ''}`}>
      <div className={mail.ruleIcon}>
        <PanelIcon
          nombre={
            tipo === 'AGENDA' || tipo === 'TURNO'
              ? 'agenda'
              : tipo.startsWith('RESUMEN')
                ? 'resumen'
                : 'mensajes'
          }
        />
      </div>
      <div className={mail.ruleContent}>
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
        <span className={mail.schedule}>
          <PanelIcon nombre="reloj" size={13} />
          {describirRegla(tipo, regla)}
        </span>
      </div>
      <div className={mail.ruleActions}>
        <button className={styles.textButton} onClick={onEdit} aria-label={`Configurar ${titulo}`}>
          Configurar
        </button>
        <label className={`form-check form-switch m-0 ${mail.switchTarget}`}>
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            aria-label={titulo}
            checked={regla.activo && habilitado}
            disabled={!habilitado}
            onChange={onToggle}
          />
        </label>
      </div>
    </div>
  );
}

function ReminderEditor({
  tipo,
  inicial,
  onSave,
  onCancel,
}: {
  tipo: TipoRecordatorio;
  inicial: ReglaCorreo;
  onSave: (regla: ReglaCorreo) => string;
  onCancel: () => void;
}) {
  return (
    <PanelForm<ReglaCorreo>
      initialValues={inicial}
      validate={(values) => erroresReglaCorreo(tipo, values)}
      onSave={(regla) =>
        onSave({ ...regla, asunto: regla.asunto.trim(), mensaje: regla.mensaje.trim() })
      }
    >
      <ReminderFields tipo={tipo} onCancel={onCancel} />
    </PanelForm>
  );
}

function ReminderFields({ tipo, onCancel }: { tipo: TipoRecordatorio; onCancel: () => void }) {
  const { values: regla, setFieldValue, isSubmitting } = useFormikContext<ReglaCorreo>();
  const { datos, buscarCliente, nombre } = useReminderPanel();

  const hoy = fechaLocal(new Date());
  const proxima = datos.citas
    .filter((cita) => cita.fecha >= hoy && !['CANCELADA', 'COMPLETADA'].includes(cita.estado))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
  const valores = {
    cliente: proxima ? buscarCliente(proxima.clienteId).nombre : 'Sofía Aguirre',
    artista: nombre,
    fecha: mostrarFecha(proxima?.fecha || moverFecha(hoy, 1), { day: 'numeric', month: 'long' }),
    hora: proxima?.hora || '14:00',
    trabajo: proxima?.titulo || 'tu tatuaje',
    agenda: datos.citas
      .filter((cita) => cita.fecha === (proxima?.fecha || hoy) && cita.estado !== 'CANCELADA')
      .map((cita) => `${cita.hora} · ${buscarCliente(cita.clienteId).nombre} · ${cita.titulo}`)
      .join('\n'),
    resumen: `${datos.consultas.length} consultas recibidas\n${datos.citas.filter((cita) => cita.estado === 'COMPLETADA').length} sesiones completadas`,
  };
  return (
    <fieldset disabled={isSubmitting}>
      {['TURNO', 'CUIDADOS'].includes(tipo) && (
        <PanelField
          name="horas"
          label={
            tipo === 'TURNO' ? 'Horas antes del turno' : 'Horas después de completar la sesión'
          }
          type="number"
          required
          min={tipo === 'TURNO' ? 1 : 0}
          max={168}
        />
      )}
      {tipo === 'RESENA' && (
        <PanelField
          name="dias"
          label="Días después de completar la sesión"
          type="number"
          required
          min={1}
          max={30}
        />
      )}
      {tipo === 'AGENDA' && (
        <PanelField name="momentoAgenda" label="Cuándo recibirla" as="select">
          <option value="ANTERIOR">La noche anterior</option>
          <option value="MISMO_DIA">El mismo día</option>
        </PanelField>
      )}
      {tipo === 'RESUMEN_SEMANAL' && (
        <PanelField name="diaSemana" label="Día de envío" as="select" type="number">
          {diasSemana.map((dia, indice) => (
            <option key={dia} value={indice}>
              {dia}
            </option>
          ))}
        </PanelField>
      )}
      {['AGENDA', 'RESUMEN_SEMANAL', 'RESUMEN_MENSUAL'].includes(tipo) && (
        <PanelField
          name="hora"
          label="Horario de envío"
          type="time"
          required
          hint={
            tipo === 'RESUMEN_MENSUAL' ? 'Día 1, con la actividad del mes anterior.' : undefined
          }
        />
      )}
      <PanelField name="asunto" label="Asunto" required minLength={3} maxLength={120} />
      <PanelField
        name="mensaje"
        label="Contenido del correo"
        as="textarea"
        rows={9}
        required
        minLength={10}
        maxLength={3000}
        hint={`${regla.mensaje.length}/3000 caracteres`}
      />
      <div className={mail.variables}>
        <span>Insertar variable</span>
        <div>
          {variablesCorreo(tipo).map((variable) => (
            <button
              type="button"
              key={variable}
              onClick={() => {
                void setFieldValue('mensaje', regla.mensaje + ' {{' + variable + '}}');
              }}
            >
              {'{{' + variable + '}}'}
            </button>
          ))}
        </div>
      </div>
      <details className={mail.emailDetails}>
        <summary>
          Ver correo <PanelIcon nombre="chevron" size={14} />
        </summary>
        <article className={mail.email}>
          <header>
            <span>InkManager</span>
            <strong>{reemplazarVariables(regla.asunto, valores)}</strong>
            <small>
              Para:{' '}
              {['TURNO', 'CUIDADOS', 'RESENA'].includes(tipo) ? valores.cliente : valores.artista}
            </small>
          </header>
          <div>{reemplazarVariables(regla.mensaje, valores)}</div>
        </article>
      </details>
      <div className={styles.formActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className={styles.button} type="submit">
          Guardar recordatorio
        </button>
      </div>
    </fieldset>
  );
}
