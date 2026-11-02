'use client';
import { useState } from 'react';
import { useFormikContext } from 'formik';
import { PageHeader } from '@/components/panel/PanelUI';
import { PanelForm, PanelField } from '@/components/panel/PanelForm';
import { ciudadesEjemplo } from '@/mocks/panel-artista';
import type { PerfilEstudio } from '@/types/panel-estudio';
import { useStudio } from './StudioProvider';
import styles from '@/components/panel/workspace.module.css';
import studio from './studio.module.css';

export function StudioProfile() {
  const { datos, setDatos } = useStudio();
  const [aviso, setAviso] = useState('');
  return (
    <>
      <PageHeader titulo="Perfil del estudio" />
      {aviso && (
        <p role="status" className={styles.notice}>
          {aviso}
        </p>
      )}
      <PanelForm<PerfilEstudio>
        initialValues={datos.perfil}
        className={studio.profile}
        validate={(v) => {
          const errores: Partial<Record<keyof PerfilEstudio, string>> = {};
          if (v.nombre.trim().length < 2 || v.nombre.trim().length > 80)
            errores.nombre = 'Usá entre 2 y 80 caracteres.';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) || v.email.length > 254)
            errores.email = 'Ingresá un email válido.';
          if (!/^[+\d\s()-]{7,30}$/.test(v.telefono))
            errores.telefono = 'Ingresá un teléfono válido.';
          if (!ciudadesEjemplo.includes(v.ciudad)) errores.ciudad = 'Elegí una ciudad de la lista.';
          if (v.direccion.trim().length < 5 || v.direccion.length > 160)
            errores.direccion = 'Usá entre 5 y 160 caracteres.';
          if (v.biografia.trim().length < 10 || v.biografia.length > 300)
            errores.biografia = 'La descripción debe tener entre 10 y 300 caracteres.';
          return errores;
        }}
        onSave={(perfil) => {
          setDatos((d) => ({
            ...d,
            perfil: Object.fromEntries(
              Object.entries(perfil).map(([k, v]) => [k, v.trim()]),
            ) as unknown as PerfilEstudio,
          }));
          setAviso('Perfil guardado.');
        }}
      >
        <section className={styles.settingsSection}>
          <div>
            <h2>El estudio</h2>
            <p>La información de tu negocio.</p>
          </div>
          <div>
            <PanelField
              name="nombre"
              label="Nombre del estudio"
              minLength={2}
              maxLength={80}
              required
            />
            <PanelField
              name="biografia"
              label="Descripción"
              as="textarea"
              rows={4}
              minLength={10}
              maxLength={300}
              required
            />
            <BioCount />
          </div>
        </section>
        <section className={styles.settingsSection}>
          <div>
            <h2>Contacto y ubicación</h2>
          </div>
          <div>
            <div className={styles.formGrid}>
              <PanelField
                name="email"
                label="Email de contacto"
                type="email"
                required
                maxLength={254}
              />
              <PanelField name="telefono" label="Teléfono" type="tel" required maxLength={30} />
            </div>
            <PanelField name="ciudad" label="Ciudad" as="select" required>
              {ciudadesEjemplo.map((c) => (
                <option value={c} key={c}>
                  {c}
                </option>
              ))}
            </PanelField>
            <PanelField name="direccion" label="Dirección" required maxLength={160} />
          </div>
        </section>
        <div className={styles.formActions}>
          <button className={styles.button} type="submit">
            Guardar perfil
          </button>
        </div>
      </PanelForm>
    </>
  );
}
function BioCount() {
  const { values } = useFormikContext<PerfilEstudio>();
  return <p className={studio.formNote}>{values.biografia.length}/300 caracteres</p>;
}
export function StudioSettings() {
  const { datos, setDatos } = useStudio();
  const [aviso, setAviso] = useState('');
  return (
    <>
      <PageHeader titulo="Configuración" />
      {aviso && (
        <p role="status" className={styles.notice}>
          {aviso}
        </p>
      )}
      <PanelForm
        initialValues={{ horas: datos.plazoPropuestasHoras }}
        validate={(v) =>
          !Number.isInteger(v.horas) || v.horas < 0 || v.horas > 720
            ? { horas: 'Elegí entre 1 y 720 horas, o 0 para cierre manual.' }
            : {}
        }
        onSave={(v) => {
          setDatos((d) => ({ ...d, plazoPropuestasHoras: v.horas }));
          setAviso('Configuración guardada.');
        }}
      >
        <section className={styles.settingsSection}>
          <div>
            <h2>Recepción de propuestas</h2>
            <p>Plazo inicial para las nuevas consultas.</p>
          </div>
          <div>
            <PanelField
              name="horas"
              label="Horas para presentar propuestas"
              type="number"
              min={0}
              max={720}
              required
              hint="0: solo cierre manual. Las consultas abiertas conservan su fecha actual."
            />
            <p className={studio.formNote}>
              Al cerrar: una propuesta disponible asigna el artista; varias pasan a elección del
              cliente. Sin propuestas, el estudio asigna.
            </p>
          </div>
        </section>
        <section className={styles.settingsSection}>
          <div>
            <h2>Modalidad del equipo</h2>
          </div>
          <p>
            Los artistas pertenecen a un solo estudio y trabajan bajo esa modalidad mientras dure el
            vínculo. Solo los integrantes activos pueden presentar propuestas y recibir nuevas
            asignaciones.
          </p>
        </section>
        <div className={styles.formActions}>
          <button className={styles.button} type="submit">
            Guardar configuración
          </button>
        </div>
      </PanelForm>
    </>
  );
}
