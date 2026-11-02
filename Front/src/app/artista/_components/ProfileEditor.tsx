'use client';

import { useEffect, useRef, useState } from 'react';
import { guardarMiPerfil, obtenerEstilos } from '@/services/artistas.service';
import { camposPendientes } from '@/lib/perfil-artista';
import type { PerfilArtista } from '@/types/artista';
import { useArtistProfile } from './ArtistProfileProvider';
import { PhotoField } from './PhotoField';
import { StylePicker } from './StylePicker';
import { LocationFields } from '@/components/forms/LocationFields';
import styles from './panel.module.css';
import { useFormikContext, type FormikErrors } from 'formik';
import { PanelField, PanelForm } from './PanelForm';
import { PageHeader } from './PanelUI';
import common from '@/components/panel/workspace.module.css';

export function ProfileEditor() {
  const { perfil, actualizarPerfil, error: errorPerfil, reintentar } = useArtistProfile();
  const [estilos, setEstilos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    obtenerEstilos(controller.signal)
      .then((opciones) => {
        setEstilos(opciones);
        setError('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'No pudimos cargar los estilos.');
      });
    return () => controller.abort();
  }, [intento]);
  return (
    <>
      <PageHeader titulo="Mi perfil" />
      {(error || errorPerfil) && (
        <div role="alert" className="alert alert-danger">
          {error || errorPerfil}
          <button
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={() => {
              reintentar();
              setIntento((valor) => valor + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {perfil && estilos.length ? (
        <ProfileForm perfil={perfil} estilos={estilos} onSaved={actualizarPerfil} />
      ) : (
        !error && !errorPerfil && <p role="status">Cargando tu perfil…</p>
      )}
    </>
  );
}

interface ProfileValues {
  nombreArtistico: string;
  biografia: string;
  ciudadId: number | null;
  estilosPrincipales: string[];
  foto: File | null;
}

function ProfileForm({
  perfil,
  estilos,
  onSaved,
}: {
  perfil: PerfilArtista;
  estilos: string[];
  onSaved: (perfil: PerfilArtista) => void;
}) {
  const result = useRef<PerfilArtista | null>(null);
  const [guardado, setGuardado] = useState(false);
  const faltantes = camposPendientes(perfil);
  function validate(values: ProfileValues) {
    const errors: FormikErrors<ProfileValues> = {};
    if (
      values.nombreArtistico.trim() &&
      (values.nombreArtistico.trim().length < 2 || values.nombreArtistico.trim().length > 50)
    )
      errors.nombreArtistico = 'Usá entre 2 y 50 caracteres.';
    if (values.biografia.length > 300)
      errors.biografia = 'La biografía puede tener hasta 300 caracteres.';
    if (perfil.ciudad && !perfil.ciudadId && !values.ciudadId)
      errors.ciudadId = 'Elegí tu ciudad de la lista para guardar el perfil.';
    return errors;
  }
  return (
    <PanelForm<ProfileValues>
      className={styles.profileForm}
      enableReinitialize
      initialValues={{
        nombreArtistico: perfil.nombreArtistico || '',
        biografia: perfil.biografia || '',
        ciudadId: perfil.ciudadId,
        estilosPrincipales: perfil.estilosPrincipales,
        foto: null,
      }}
      validate={validate}
      onSave={async (values) => {
        setGuardado(false);
        const datos = new FormData();
        datos.set('nombreArtistico', values.nombreArtistico.trim());
        datos.set('biografia', values.biografia.trim());
        datos.set('ciudadId', values.ciudadId ? String(values.ciudadId) : '');
        datos.set('estilosPrincipales', JSON.stringify(values.estilosPrincipales));
        if (values.foto) datos.set('imagen', values.foto);
        result.current = await guardarMiPerfil(datos);
      }}
      onSaved={() => {
        if (result.current) {
          onSaved(result.current);
          setGuardado(true);
        }
      }}
    >
      {faltantes.length > 0 && (
        <p className={styles.pendingFields}>Pendiente: {faltantes.join(', ')}.</p>
      )}
      <ProfileFields perfil={perfil} estilos={estilos} />
      {guardado && (
        <p role="status" className={styles.feedback}>
          Perfil guardado.
        </p>
      )}
    </PanelForm>
  );
}

function ProfileFields({ perfil, estilos }: { perfil: PerfilArtista; estilos: string[] }) {
  const { values, touched, errors, setFieldValue, isSubmitting } =
    useFormikContext<ProfileValues>();
  const [procesando, setProcesando] = useState(false);
  return (
    <fieldset disabled={isSubmitting}>
      <div className={styles.profileFields}>
        <PhotoField
          key={perfil.fotoPerfil || 'sin-foto'}
          id="profile-photo"
          label="Foto de perfil"
          actual={perfil.fotoPerfil}
          onChange={(file) => {
            void setFieldValue('foto', file);
          }}
          onProcessing={setProcesando}
        />
        <div>
          <PanelField
            name="nombreArtistico"
            label="Nombre artístico"
            minLength={2}
            maxLength={50}
            autoComplete="nickname"
          />
          <PanelField
            name="biografia"
            label="Biografía"
            as="textarea"
            rows={4}
            maxLength={300}
            hint={`${values.biografia.length}/300`}
          />
          <fieldset
            tabIndex={-1}
            aria-invalid={touched.ciudadId && errors.ciudadId ? true : undefined}
            aria-describedby={errors.ciudadId ? 'profile-city-error' : undefined}
          >
            <LocationFields
              key={perfil.ciudadId ?? 'sin-ciudad'}
              paisActual={perfil.pais}
              provinciaActual={perfil.provinciaId}
              ciudadId={values.ciudadId}
              ciudadAnterior={!perfil.ciudadId ? perfil.ciudad : null}
              onChange={(value) => {
                void setFieldValue('ciudadId', value);
              }}
            />
            {touched.ciudadId && errors.ciudadId && (
              <p id="profile-city-error" role="alert" className="text-danger">
                {errors.ciudadId}
              </p>
            )}
          </fieldset>
          <StylePicker
            label="Estilos principales"
            opciones={estilos}
            seleccionados={values.estilosPrincipales}
            onChange={(value) => {
              void setFieldValue('estilosPrincipales', value);
            }}
          />
        </div>
      </div>
      <div className={common.formActions}>
        <button className={common.button} type="submit" disabled={procesando || isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>
    </fieldset>
  );
}
