'use client';
import { useRef } from 'react';
import { useFormikContext } from 'formik';
import Form from 'react-bootstrap/Form';
import { PanelForm, PanelSubmitButton } from './PanelForm';
import { guardarHorario } from '@/services/disponibilidad.service';
import { diasSemana, semanaInicial, erroresSemana, minutos } from '@/lib/disponibilidad';
import type { DisponibilidadAgenda, SemanaDisponible } from '@/types/disponibilidad';
import styles from './workspace.module.css';
import horario from './availability.module.css';
interface Valores {
  semana: SemanaDisponible;
  version: number;
}
export function WeeklyHoursEditor({
  datos,
  onSaved,
  onReload,
}: {
  datos: DisponibilidadAgenda;
  onSaved: (d: DisponibilidadAgenda) => void;
  onReload: () => void;
}) {
  const guardada = useRef<DisponibilidadAgenda | null>(null);
  return (
    <section className={styles.surface}>
      <div className={styles.surfaceHeading}>
        <h2>Horarios de atención</h2>
      </div>
      <div className={styles.surfaceBody}>
        <PanelForm<Valores>
          initialValues={{ semana: datos.semana || semanaInicial(), version: datos.version }}
          validate={(v) =>
            Object.keys(erroresSemana(v.semana)).length
              ? { semana: 'Revisá los rangos horarios.' }
              : {}
          }
          onSave={async (v) => {
            guardada.current = await guardarHorario(datos.artista.id, v.semana, v.version);
          }}
          onSaved={() => {
            if (guardada.current) onSaved(guardada.current);
          }}
        >
          <WeekFields
            editable={datos.puedeEditar}
            versionActual={datos.version}
            onReload={onReload}
          />
        </PanelForm>
      </div>
    </section>
  );
}
function WeekFields({
  editable,
  versionActual,
  onReload,
}: {
  editable: boolean;
  versionActual: number;
  onReload: () => void;
}) {
  const { values, setFieldValue, submitCount } = useFormikContext<Valores>();
  const errores = erroresSemana(values.semana),
    desactualizado = values.version !== versionActual;
  return (
    <>
      {desactualizado && (
        <div className={styles.notice}>
          <p>La disponibilidad cambió desde que abriste el formulario.</p>
          <button type="button" className={styles.textButton} onClick={onReload}>
            Actualizar horarios
          </button>
        </div>
      )}
      <fieldset disabled={!editable}>
        {values.semana.map((dia, i) => {
          const nombre = diasSemana[dia.dia - 1]!,
            error = submitCount ? errores[String(dia.dia)] : '';
          return (
            <fieldset
              key={dia.dia}
              className={horario.day}
              aria-label={nombre}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `day-error-${dia.dia}` : undefined}
              tabIndex={-1}
            >
              <div className={horario.dayHeading}>
                <Form.Check
                  type="checkbox"
                  id={`working-day-${dia.dia}`}
                  label={nombre}
                  checked={dia.rangos.length > 0}
                  onChange={(e) => {
                    void setFieldValue(
                      `semana.${i}.rangos`,
                      e.target.checked ? [{ desde: '09:00', hasta: '18:00' }] : [],
                    );
                  }}
                />
                {!dia.rangos.length && <small>Sin atención</small>}
              </div>
              <div className={horario.ranges}>
                {dia.rangos.map((r, j) => (
                  <div className={horario.range} key={j}>
                    <label>
                      Desde
                      <Form.Control
                        type="time"
                        aria-label={`Desde ${nombre}, rango ${j + 1}`}
                        value={r.desde}
                        onChange={(e) => {
                          void setFieldValue(`semana.${i}.rangos.${j}.desde`, e.target.value);
                        }}
                      />
                    </label>
                    <label>
                      Hasta
                      <Form.Control
                        type="time"
                        aria-label={`Hasta ${nombre}, rango ${j + 1}`}
                        value={r.hasta === '24:00' ? '00:00' : r.hasta}
                        onChange={(e) => {
                          void setFieldValue(
                            `semana.${i}.rangos.${j}.hasta`,
                            e.target.value === '00:00' ? '24:00' : e.target.value,
                          );
                        }}
                      />
                      {r.hasta === '24:00' && <small>Medianoche</small>}
                    </label>
                    <button
                      type="button"
                      className={styles.textButton}
                      aria-label={`Quitar rango ${j + 1} de ${nombre}`}
                      onClick={() => {
                        void setFieldValue(
                          `semana.${i}.rangos`,
                          dia.rangos.filter((_, n) => n !== j),
                        );
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                {dia.rangos.length > 0 && dia.rangos.length < 8 && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => {
                      const fin = dia.rangos.at(-1)!.hasta;
                      const inicio = minutos(fin) < 1380 ? fin : '09:00';
                      const hasta = minutos(inicio) + 60;
                      void setFieldValue(`semana.${i}.rangos`, [
                        ...dia.rangos,
                        {
                          desde: inicio,
                          hasta: `${String(Math.floor(hasta / 60)).padStart(2, '0')}:${String(hasta % 60).padStart(2, '0')}`,
                        },
                      ]);
                    }}
                  >
                    Agregar rango a {nombre.toLowerCase()}
                  </button>
                )}
                {error && (
                  <p id={`day-error-${dia.dia}`} className="text-danger mb-0" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </fieldset>
          );
        })}
        {editable && (
          <div className={styles.formActions}>
            <PanelSubmitButton disabled={desactualizado}>Guardar horarios</PanelSubmitButton>
          </div>
        )}
      </fieldset>
    </>
  );
}
