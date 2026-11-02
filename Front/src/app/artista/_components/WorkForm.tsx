'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useFormikContext, type FormikErrors } from 'formik';
import Modal from 'react-bootstrap/Modal';
import { guardarTrabajo } from '@/services/artistas.service';
import type { TrabajoArtista } from '@/types/artista';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import { PanelForm, PanelField } from './PanelForm';
import { StylePicker } from './StylePicker';
import { PhotoField } from './PhotoField';
import styles from '@/components/panel/workspace.module.css';

interface WorkValues {
  descripcion: string;
  estilos: string[];
  foto: File | null;
  estado: TrabajoArtista['estado'];
}

export function WorkForm({
  trabajo,
  estilos,
  onHide,
  onSaved,
}: {
  trabajo: TrabajoArtista | null;
  estilos: string[];
  onHide: () => void;
  onSaved: (trabajo: TrabajoArtista) => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const result = useRef<TrabajoArtista | null>(null);
  const confirmClose = useDiscardChanges();
  function validate(values: WorkValues) {
    const errors: FormikErrors<WorkValues> = {};
    if (values.descripcion.length > 1200)
      errors.descripcion = 'La descripción puede tener hasta 1200 caracteres.';
    if (values.estado === 'PUBLICADO') {
      if (!values.foto && !trabajo?.url) errors.foto = 'Agregá una foto para publicar el trabajo.';
      if (!values.descripcion.trim()) errors.descripcion = 'Describí el trabajo para publicarlo.';
      if (!values.estilos.length) errors.estilos = 'Elegí al menos un estilo.';
    }
    return errors;
  }
  return (
    <Modal
      show
      onHide={() => {
        if (!procesando && !enviando) confirmClose(onHide);
      }}
      centered
      scrollable
      fullscreen="sm-down"
      className="artist-dialog"
      aria-labelledby="work-form-title"
      backdrop={enviando ? 'static' : true}
    >
      <Modal.Header closeButton={!procesando && !enviando} closeLabel="Cerrar">
        <Modal.Title as="h2" id="work-form-title">
          {trabajo ? 'Editar trabajo' : 'Nuevo trabajo'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PanelForm<WorkValues>
          initialValues={{
            descripcion: trabajo?.descripcion || '',
            estilos: trabajo?.estilos || [],
            foto: null,
            estado: trabajo?.estado || 'BORRADOR',
          }}
          validate={validate}
          onSave={async (values) => {
            const datos = new FormData();
            datos.set('descripcion', values.descripcion.trim());
            datos.set('estilos', JSON.stringify(values.estilos));
            datos.set('estado', values.estado);
            if (values.foto) datos.set('imagen', values.foto);
            setEnviando(true);
            try {
              result.current = await guardarTrabajo(datos, trabajo?.id);
            } finally {
              setEnviando(false);
            }
          }}
          onSaved={() => {
            if (result.current) onSaved(result.current);
          }}
        >
          <WorkFields
            trabajo={trabajo}
            estilos={estilos}
            procesando={procesando}
            onProcessing={setProcesando}
          />
        </PanelForm>
      </Modal.Body>
    </Modal>
  );
}

function WorkFields({
  trabajo,
  estilos,
  procesando,
  onProcessing,
}: {
  trabajo: TrabajoArtista | null;
  estilos: string[];
  procesando: boolean;
  onProcessing: (value: boolean) => void;
}) {
  const { values, errors, touched, setFieldValue, isSubmitting } = useFormikContext<WorkValues>();
  return (
    <fieldset disabled={isSubmitting}>
      <PhotoField
        id="work-photo"
        label="Foto del trabajo"
        actual={trabajo?.url}
        validationError={touched.foto && errors.foto ? String(errors.foto) : undefined}
        onChange={(file) => {
          void setFieldValue('foto', file);
        }}
        onProcessing={onProcessing}
      />
      <PanelField
        name="descripcion"
        label="Descripción"
        as="textarea"
        rows={3}
        maxLength={1200}
        hint={`${values.descripcion.length}/1200`}
        placeholder="Contá qué hiciste en este tatuaje…"
      />
      <StylePicker
        opciones={estilos}
        seleccionados={values.estilos}
        error={touched.estilos && errors.estilos ? String(errors.estilos) : undefined}
        onChange={(value) => {
          void setFieldValue('estilos', value);
        }}
      />
      <div className={`${styles.formActions} ${styles.panelFormFooter}`}>
        <button
          type="submit"
          className={styles.secondaryButton}
          disabled={procesando || isSubmitting}
          onClick={() =>
            flushSync(() => {
              void setFieldValue('estado', 'BORRADOR', false);
            })
          }
        >
          Guardar borrador
        </button>
        <button
          type="submit"
          className={styles.button}
          disabled={procesando || isSubmitting}
          onClick={() =>
            flushSync(() => {
              void setFieldValue('estado', 'PUBLICADO', false);
            })
          }
        >
          {isSubmitting
            ? 'Guardando…'
            : trabajo?.estado === 'PUBLICADO'
              ? 'Guardar y publicar'
              : 'Publicar trabajo'}
        </button>
      </div>
    </fieldset>
  );
}
