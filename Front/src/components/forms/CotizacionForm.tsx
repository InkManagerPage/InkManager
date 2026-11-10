'use client';

import { useState } from 'react';
import { Form, Formik } from 'formik';
import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

import { StepColor } from '@/app/cotizacion/components/steps/StepColor';
import { StepEstilo } from '@/app/cotizacion/components/steps/StepEstilo';
import { StepModelo } from '@/app/cotizacion/components/steps/StepModelo';
import { StepZonaGeneral } from '@/app/cotizacion/components/steps/StepZonaGeneral';
import { StepZonaEspecifica } from '@/app/cotizacion/components/steps/StepZonaEspecifica';
import { StepUbicacionArea } from '@/app/cotizacion/components/steps/StepUbicacionArea';
import { StepDescripcion } from '@/app/cotizacion/components/steps/StepDescripcion';
import { StepExtra } from '@/app/cotizacion/components/steps/StepExtra';
import { StepContacto } from '@/app/cotizacion/components/steps/StepContacto';

interface CotizacionFormProps {
  onSubmit: (values: CotizacionValues) => Promise<void>;
  pedirContacto?: boolean;
  error?: string;
}

const initialValues: CotizacionValues = {
  nombre: '',
  email: '',
  telefono: '',
  esColor: null,
  estilo: '',
  generoLienzo: '',
  zonaCuerpo: '',
  zonaEspecifica: '',
  tamanoProporcion: '',
  descripcion: '',
  imagenReferencia: null,
  tiempoEstimado: '',
  tieneTatuajesPrevios: null,
};

const pasos = [
  {
    Componente: StepColor,
    validar: (v: CotizacionValues) => v.esColor !== null,
    mensaje: 'Elegí el tipo de color.',
  },
  {
    Componente: StepEstilo,
    validar: (v: CotizacionValues) => Boolean(v.estilo),
    mensaje: 'Elegí un estilo.',
  },
  {
    Componente: StepModelo,
    validar: (v: CotizacionValues) => Boolean(v.generoLienzo),
    mensaje: 'Elegí un modelo corporal.',
  },
  {
    Componente: StepZonaGeneral,
    validar: (v: CotizacionValues) => Boolean(v.zonaCuerpo),
    mensaje: 'Elegí una zona del cuerpo.',
  },
  {
    Componente: StepZonaEspecifica,
    validar: (v: CotizacionValues) => Boolean(v.zonaEspecifica),
    mensaje: 'Elegí la zona específica.',
  },
  { Componente: StepUbicacionArea, validar: () => true, mensaje: '' },
  {
    Componente: StepDescripcion,
    validar: (v: CotizacionValues) => Boolean(v.descripcion.trim()),
    mensaje: 'Describí tu idea.',
  },
  {
    Componente: StepExtra,
    validar: (v: CotizacionValues) => Boolean(v.tiempoEstimado) && v.tieneTatuajesPrevios !== null,
    mensaje: 'Completá el plazo y si ya tenés tatuajes.',
  },
];

export function CotizacionForm({ onSubmit, pedirContacto = false, error }: CotizacionFormProps) {
  const [paso, setPaso] = useState(0);
  const [errorPaso, setErrorPaso] = useState('');
  const total = pasos.length + Number(pedirContacto);
  const actual = pasos[paso];
  const esUltimo = paso === total - 1;

  return (
    <Formik<CotizacionValues>
      initialValues={initialValues}
      onSubmit={async (values) => {
        setErrorPaso('');
        if (actual && !actual.validar(values)) {
          setErrorPaso(actual.mensaje);
        } else if (!esUltimo) {
          setPaso(paso + 1);
        } else if (pedirContacto && values.nombre.trim().length < 2) {
          setErrorPaso('Ingresá tu nombre completo.');
        } else {
          await onSubmit(values);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => (
        <Form>
          <fieldset disabled={isSubmitting}>
            <p aria-live="polite" className={styles.eyebrow}>
              Paso {paso + 1} de {total}
            </p>
            <progress
              className="w-100 mb-3"
              aria-label="Progreso del formulario"
              value={paso + 1}
              max={total}
            />
            {actual ? (
              <actual.Componente values={values} setFieldValue={setFieldValue} />
            ) : (
              <StepContacto />
            )}
            {(errorPaso || (esUltimo && error)) && (
              <p className={styles.error} role="alert">
                {errorPaso || error}
              </p>
            )}
            <div className="d-flex gap-3 mt-4">
              {paso > 0 && (
                <button
                  type="button"
                  className={styles.outline}
                  onClick={() => {
                    setErrorPaso('');
                    setPaso(paso - 1);
                  }}
                >
                  Anterior
                </button>
              )}
              <button type="submit" className={styles.submit}>
                {esUltimo ? (isSubmitting ? 'Enviando…' : 'Enviar consulta') : 'Siguiente'}
              </button>
            </div>
          </fieldset>
        </Form>
      )}
    </Formik>
  );
}
