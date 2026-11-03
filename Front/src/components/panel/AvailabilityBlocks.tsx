'use client';
import { useRef } from 'react';
import { useFormikContext } from 'formik';
import Form from 'react-bootstrap/Form';
import { PanelForm, PanelField, PanelSubmitButton } from './PanelForm';
import { guardarBloqueo } from '@/services/disponibilidad.service';
import { erroresBloqueo } from '@/lib/disponibilidad';
import { relojEnZona } from '@/lib/agenda';
import type {
  DisponibilidadAgenda,
  BloqueoAgenda,
  FormularioBloqueo,
} from '@/types/disponibilidad';
import styles from './workspace.module.css';
export function AvailabilityBlockForm({
  datos,
  bloqueo,
  onSaved,
  onCancel,
}: {
  datos: DisponibilidadAgenda;
  bloqueo?: BloqueoAgenda;
  onSaved: (d: DisponibilidadAgenda) => void;
  onCancel: () => void;
}) {
  const guardado = useRef<DisponibilidadAgenda | null>(null),
    hoy = relojEnZona(datos.zonaHoraria).fecha;
  return (
    <PanelForm<FormularioBloqueo>
      initialValues={{
        motivo: bloqueo?.motivo || '',
        desdeFecha: bloqueo?.desdeFecha || hoy,
        desdeHora: bloqueo?.desdeHora || '09:00',
        hastaFecha: bloqueo?.hastaFecha || hoy,
        hastaHora: bloqueo?.hastaHora || '18:00',
        diaCompleto: bloqueo?.diaCompleto ?? true,
        version: datos.version,
      }}
      validate={erroresBloqueo}
      onSave={async (v) => {
        guardado.current = await guardarBloqueo(datos.artista.id, v, bloqueo?.id);
      }}
      onSaved={() => {
        if (guardado.current) onSaved(guardado.current);
      }}
    >
      <PanelField
        name="motivo"
        label="Motivo"
        required
        maxLength={120}
        placeholder="Vacaciones, feriado, asunto personal…"
      />
      <BlockFields />
      <div className={styles.formActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>
          Volver
        </button>
        <PanelSubmitButton>Guardar bloqueo</PanelSubmitButton>
      </div>
    </PanelForm>
  );
}
function BlockFields() {
  const { values, setFieldValue } = useFormikContext<FormularioBloqueo>();
  return (
    <>
      <Form.Check
        className="mb-3"
        id="whole-days"
        type="checkbox"
        label="Días completos"
        checked={values.diaCompleto}
        onChange={(e) => {
          void setFieldValue('diaCompleto', e.target.checked);
        }}
      />
      <div className={styles.formGrid}>
        <PanelField name="desdeFecha" label="Desde el día" type="date" required />
        <PanelField
          name="hastaFecha"
          label={values.diaCompleto ? 'Hasta el día, incluido' : 'Hasta el día'}
          type="date"
          required
        />
        {!values.diaCompleto && (
          <>
            <PanelField name="desdeHora" label="Desde las" type="time" required />
            <PanelField name="hastaHora" label="Hasta las" type="time" required />
          </>
        )}
      </div>
    </>
  );
}
