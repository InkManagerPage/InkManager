'use client';

import { useRef, useState } from 'react';
import { Form, Formik } from 'formik';
import type { CotizacionValues, PasoCotizacionProps } from '@/types/cotizacion';
import { descripcionValida } from '@/lib/descripcion-tatuaje';
import styles from '@/app/cotizacion/components/cotizacion.module.css';

import { StepColor } from '@/app/cotizacion/components/steps/StepColor';
import { StepEstilo } from '@/app/cotizacion/components/steps/StepEstilo';
import { StepModelo } from '@/app/cotizacion/components/steps/StepModelo';
import { StepZonaGeneral } from '@/app/cotizacion/components/steps/StepZonaGeneral';
import { StepZonaEspecifica } from '@/app/cotizacion/components/steps/StepZonaEspecifica';
import { StepUbicacionArea } from '@/app/cotizacion/components/steps/StepUbicacionArea';
import { StepDescripcion } from '@/app/cotizacion/components/steps/StepDescripcion';
import { StepExtra } from '@/app/cotizacion/components/steps/StepExtra';
import { StepContacto } from '@/app/cotizacion/components/steps/StepContacto';

const initialValues: CotizacionValues = {
  nombre: '',
  email: '',
  telefono: '',
  promociones: false,
  esColor: null,
  estilo: '',
  generoLienzo: '',
  zonaCuerpo: '',
  zonaEspecifica: '',
  marcasZona: [],
  descripcion: '',
  imagenReferencia: null,
  tieneTatuajesPrevios: null,
};

const pasos: {
  titulo: string;
  Componente: (props: PasoCotizacionProps) => React.JSX.Element;
  validar: (v: CotizacionValues) => boolean;
  mensaje: string;
}[] = [
  {
    titulo: '¿Color o negro y gris?',
    Componente: StepColor,
    validar: (v) => v.esColor !== null,
    mensaje: 'Elegí el tipo de color.',
  },
  {
    titulo: 'Elegí un estilo',
    Componente: StepEstilo,
    validar: (v) => Boolean(v.estilo),
    mensaje: 'Elegí un estilo.',
  },
  {
    titulo: 'Elegí un modelo corporal',
    Componente: StepModelo,
    validar: (v) => Boolean(v.generoLienzo),
    mensaje: 'Elegí un modelo corporal.',
  },
  {
    titulo: '¿En qué zona va el tatuaje?',
    Componente: StepZonaGeneral,
    validar: (v) => Boolean(v.zonaCuerpo),
    mensaje: 'Elegí una zona del cuerpo.',
  },
  {
    titulo: 'Elegí la zona específica',
    Componente: StepZonaEspecifica,
    validar: (v) => Boolean(v.zonaEspecifica),
    mensaje: 'Elegí la zona específica.',
  },
  {
    titulo: 'Marcá el área del tatuaje',
    Componente: StepUbicacionArea,
    validar: (v) => v.marcasZona.length > 0,
    mensaje: 'Marcá al menos un área en la foto para continuar.',
  },
  {
    titulo: 'Contanos tu idea',
    Componente: StepDescripcion,
    validar: (v) => descripcionValida(v.descripcion),
    mensaje: 'La descripción debe tener al menos 20 caracteres.',
  },
  {
    titulo: '¿Ya tenés tatuajes?',
    Componente: StepExtra,
    validar: (v) => v.tieneTatuajesPrevios !== null,
    mensaje: 'Elegí si ya tenés tatuajes.',
  },
  {
    titulo: 'Tus datos de contacto',
    Componente: StepContacto,
    validar: (v) => v.nombre.trim().length >= 2,
    mensaje: 'Ingresá tu nombre completo.',
  },
];

export function CotizacionForm({
  onSubmit,
  error,
}: {
  onSubmit: (values: CotizacionValues) => Promise<void>;
  error?: string;
}) {
  const [paso, setPaso] = useState(0);
  const [errorPaso, setErrorPaso] = useState('');
  const titulo = useRef<HTMLHeadingElement>(null);
  const actual = pasos[paso]!;
  const esUltimo = paso === pasos.length - 1;

  function irA(paso: number) {
    setErrorPaso('');
    setPaso(paso);
    requestAnimationFrame(() => titulo.current?.focus());
  }

  return (
    <Formik<CotizacionValues>
      initialValues={initialValues}
      onSubmit={async (values) => {
        if (!actual.validar(values)) {
          setErrorPaso(actual.mensaje);
        } else if (esUltimo) {
          setErrorPaso('');
          await onSubmit(values);
        } else {
          irA(paso + 1);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => {
        const errorVisible = errorPaso && !actual.validar(values) ? errorPaso : esUltimo && error;
        return (
          <Form>
            <fieldset disabled={isSubmitting} aria-labelledby="titulo-paso">
              <div className={styles.progreso}>
                <span>
                  Paso {paso + 1} de {pasos.length}
                </span>
                <progress
                  aria-label="Progreso del formulario"
                  value={paso + 1}
                  max={pasos.length}
                />
              </div>
              <h2 ref={titulo} id="titulo-paso" tabIndex={-1} className={styles.pasoTitulo}>
                {actual.titulo}
              </h2>
              <actual.Componente values={values} setFieldValue={setFieldValue} />
              {errorVisible && (
                <p className={styles.error} role="alert">
                  {errorVisible}
                </p>
              )}
              <div className={styles.acciones}>
                {paso > 0 && (
                  <button type="button" className={styles.secundario} onClick={() => irA(paso - 1)}>
                    Anterior
                  </button>
                )}
                <button type="submit" className={styles.primario}>
                  {esUltimo ? (isSubmitting ? 'Enviando…' : 'Enviar consulta') : 'Siguiente'}
                </button>
              </div>
            </fieldset>
          </Form>
        );
      }}
    </Formik>
  );
}
