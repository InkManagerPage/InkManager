'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/store/AuthProvider';
import { useArtistPanel } from './ArtistPanelProvider';
import { PageHeader, PanelIcon } from './PanelUI';
import type { PreferenciasPanel } from '@/types/panel-artista';
import styles from '@/components/panel/workspace.module.css';
import { useFormikContext, type FormikErrors } from 'formik';
import { PanelField, PanelForm } from './PanelForm';

export function ArtistSettings() {
  const { usuario } = useAuth();
  const { datos, guardarPreferencias } = useArtistPanel();
  const [aviso, setAviso] = useState('');
  return (
    <>
      <PageHeader
        titulo="Configuración"
        descripcion="Horarios y preferencias de tu espacio de trabajo."
      />
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <PreferencesForm
        key={JSON.stringify(datos.preferencias)}
        inicial={datos.preferencias}
        onSave={(preferencias) => {
          guardarPreferencias(preferencias);
          setAviso('Preferencias guardadas.');
        }}
      />
      <section className={styles.settingsSection}>
        <div>
          <h2>Tu cuenta</h2>
          <p>Datos de acceso a InkManager.</p>
        </div>
        <div>
          <p className={styles.description}>{usuario?.email}</p>
          <Link href="/recuperar-contrasena" className={styles.textButton}>
            Crear o restablecer contraseña
            <PanelIcon nombre="flecha" size={15} />
          </Link>
        </div>
      </section>
      <section className={styles.settingsSection}>
        <div>
          <h2>Correos automáticos</h2>
          <p>Turnos, cuidados, reseñas y resúmenes de tu actividad.</p>
        </div>
        <div>
          <Link href="/artista/recordatorios" className={styles.textButton}>
            Administrar recordatorios
            <PanelIcon nombre="flecha" size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}

function PreferencesForm({
  inicial,
  onSave,
}: {
  inicial: PreferenciasPanel;
  onSave: (values: PreferenciasPanel) => void;
}) {
  return (
    <PanelForm<PreferenciasPanel>
      initialValues={inicial}
      validate={(values) => {
        const errors: FormikErrors<PreferenciasPanel> = {};
        if (!values.diasLaborales.length)
          errors.diasLaborales = 'Elegí al menos un día de atención.';
        if (!values.horaInicio || !values.horaFin || values.horaInicio >= values.horaFin)
          errors.horaFin = 'El horario de cierre debe ser posterior al de apertura.';
        return errors;
      }}
      onSave={onSave}
    >
      <PreferencesFields />
    </PanelForm>
  );
}
function PreferencesFields() {
  const { values, setFieldValue, errors, touched } = useFormikContext<PreferenciasPanel>();
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return (
    <>
      <section className={styles.settingsSection}>
        <div>
          <h2>Horario habitual</h2>
          <p>Tu referencia al crear nuevas sesiones.</p>
        </div>
        <div>
          <fieldset
            tabIndex={-1}
            aria-invalid={touched.diasLaborales && errors.diasLaborales ? true : undefined}
            aria-describedby={errors.diasLaborales ? 'working-days-error' : undefined}
          >
            <legend className={styles.miniTitle}>Días de atención</legend>
            <div className={styles.days}>
              {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                <label key={dia}>
                  <input
                    className="visually-hidden"
                    type="checkbox"
                    checked={values.diasLaborales.includes(dia)}
                    onChange={(event) => {
                      void setFieldValue(
                        'diasLaborales',
                        event.target.checked
                          ? [...values.diasLaborales, dia]
                          : values.diasLaborales.filter((value) => value !== dia),
                      );
                    }}
                  />
                  <span>{dias[dia]}</span>
                </label>
              ))}
            </div>
            {touched.diasLaborales && errors.diasLaborales && (
              <p id="working-days-error" className="text-danger" role="alert">
                {String(errors.diasLaborales)}
              </p>
            )}
          </fieldset>
          <div className={styles.formGrid}>
            <PanelField name="horaInicio" label="Desde" type="time" required />
            <PanelField name="horaFin" label="Hasta" type="time" required />
          </div>
        </div>
      </section>
      <div className={styles.formActions}>
        <button className={styles.button} type="submit">
          Guardar preferencias
        </button>
      </div>
    </>
  );
}
