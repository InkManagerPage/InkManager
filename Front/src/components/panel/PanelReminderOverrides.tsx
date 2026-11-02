'use client';

import Link from 'next/link';
import type { DatosPanelArtista } from '@/types/panel-artista';
import { motivoRecordatorio, recordatoriosCliente } from '@/lib/recordatorios';
import type { ExcepcionesRecordatorios, RecordatorioCliente } from '@/types/recordatorios';
import styles from '@/components/panel/workspace.module.css';

export function PanelReminderOverrides({
  datos,
  baseRuta,
  value = {},
  onChange,
  clienteId,
  porTurno = false,
  cancelado = false,
}: {
  datos: Pick<DatosPanelArtista, 'recordatorios' | 'clientes' | 'citas'>;
  baseRuta: string;
  value?: ExcepcionesRecordatorios;
  onChange: (valor: ExcepcionesRecordatorios) => void;
  clienteId?: string;
  porTurno?: boolean;
  cancelado?: boolean;
}) {
  const cliente = datos.clientes.find((item) => item.id === clienteId);
  function elegir(tipo: RecordatorioCliente, valor: string) {
    const siguientes = { ...value };
    if (valor === '') delete siguientes[tipo];
    else siguientes[tipo] = valor === 'SI';
    onChange(siguientes);
  }
  return (
    <fieldset className={styles.reminderExceptions}>
      <legend>Recordatorios por correo</legend>
      <p>
        {porTurno
          ? 'Elegí excepciones para esta sesión. El resto conserva las preferencias del cliente.'
          : 'Personalizá los correos de este cliente sin cambiar las reglas generales.'}
      </p>
      {!datos.recordatorios.clientesHabilitados && (
        <p className={styles.muted}>
          Los envíos a clientes están desactivados en la configuración general.
        </p>
      )}
      {recordatoriosCliente.map((opcion) => {
        const heredado = porTurno
          ? (cliente?.recordatorios?.[opcion.id] ?? datos.recordatorios.reglas[opcion.id].activo)
          : datos.recordatorios.reglas[opcion.id].activo;
        return (
          <div className={styles.field} key={opcion.id}>
            <label htmlFor={`reminder-${porTurno ? 'turno' : 'cliente'}-${opcion.id}`}>
              {opcion.titulo}
            </label>
            <select
              id={`reminder-${porTurno ? 'turno' : 'cliente'}-${opcion.id}`}
              value={value[opcion.id] === undefined ? '' : value[opcion.id] ? 'SI' : 'NO'}
              onChange={(event) => elegir(opcion.id, event.target.value)}
            >
              <option value="">
                {porTurno ? 'Según cliente' : 'Según configuración general'} ·{' '}
                {heredado ? 'activado' : 'desactivado'}
              </option>
              <option value="SI">Activar</option>
              <option value="NO">No enviar</option>
            </select>
            <p className={styles.effectiveReminder}>
              {cancelado
                ? 'No se enviará: turno cancelado.'
                : motivoRecordatorio(datos, clienteId || '', opcion.id, value, porTurno)}
            </p>
          </div>
        );
      })}
      <Link href={`${baseRuta}/recordatorios`} className={styles.textButton}>
        Ver reglas generales
      </Link>
    </fieldset>
  );
}
