
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
  error?: string;
}

const initialValues: CotizacionValues = {
  esColor: null,
  estilo: '',
  generoLienzo: '',
  zonaCuerpo: '',
  zonaEspecifica: '',
  imagenZonaMarcada: null,
  tamanoProporcion: '',
  descripcion: '',
  imagenReferencia: null,
  tiempoEstimado: '',
  tieneTatuajesPrevios: null,
  nombre: '',
  email: '',
  telefono: '',
  ciudad: '',
};

function validarContacto(values: CotizacionValues): string | null {
  if (!values.nombre.trim()) {
    return 'Ingresa tu nombre completo.';
  }

  if (!values.email.trim()) {
    return 'Ingresa tu correo electrónico.';
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    values.email.trim()
  );

  if (!emailValido) {
    return 'Ingresa un correo electrónico válido.';
  }

  return null;
}

export function CotizacionForm({ onSubmit, error }: CotizacionFormProps) {
  const [paso, setPaso] = useState(1);

  const totalPasos = 9;
  const porcentajeProgreso = Math.round((paso / totalPasos) * 100);

  return (
    <Formik<CotizacionValues>
      initialValues={initialValues}
      onSubmit={async (values) => {
        // Esta validación también se ejecuta si el usuario presiona Enter.
        if (paso !== 9) return;

        const errorContacto = validarContacto(values);

        if (errorContacto) {
          alert(errorContacto);
          return;
        }

        await onSubmit(values);
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => {
        const avanzarPaso = () => {
          if (paso === 1 && values.esColor === null) {
            alert('Selecciona una opción de color.');
            return;
          }

          if (paso === 2 && !values.estilo) {
            alert('Selecciona un estilo.');
            return;
          }

          if (paso === 3 && !values.generoLienzo) {
            alert('Selecciona una opción.');
            return;
          }

          if (paso === 4 && !values.zonaCuerpo) {
            alert('Selecciona una zona del cuerpo.');
            return;
          }

          if (paso === 5 && !values.zonaEspecifica) {
            alert('Selecciona una zona específica.');
            return;
          }

          if (paso === 7 && !values.descripcion.trim()) {
            alert('Escribe una descripción de tu idea.');
            return;
          }

          if (paso === 8) {
            if (!values.tiempoEstimado) {
              alert('Selecciona en cuánto tiempo te gustaría tatuarte.');
              return;
            }

            if (values.tieneTatuajesPrevios === null) {
              alert('Indica si ya tienes tatuajes previos.');
              return;
            }
          }

          setPaso((actual) => Math.min(actual + 1, totalPasos));
        };

        const handleSubmitClick = (
          e: React.MouseEvent<HTMLButtonElement>
        ) => {
          const errorContacto = validarContacto(values);

          if (errorContacto) {
            e.preventDefault();
            alert(errorContacto);
          }
        };

        return (
          <Form noValidate>
            <fieldset
              disabled={isSubmitting}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              {/* Barra de progreso */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span className={styles.eyebrow} style={{ margin: 0 }}>
                    Paso {paso} de {totalPasos}
                  </span>

                  <span
                    style={{
                      fontSize: '12px',
                      color: '#62665f',
                      fontWeight: 500,
                    }}
                  >
                    {porcentajeProgreso}%
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    background: '#e0e2db',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${porcentajeProgreso}%`,
                      height: '100%',
                      background: '#202320',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Pasos */}
              {paso === 1 && (
                <StepColor values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 2 && (
                <StepEstilo values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 3 && (
                <StepModelo values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 4 && (
                <StepZonaGeneral values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 5 && (
                <StepZonaEspecifica values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 6 && (
                <StepUbicacionArea values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 7 && (
                <StepDescripcion values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 8 && (
                <StepExtra values={values} setFieldValue={setFieldValue} />
              )}

              {paso === 9 && (
                <StepContacto values={values} setFieldValue={setFieldValue} />
              )}

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              {/* Navegación */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                {paso > 1 && (
                  <button
                    type="button"
                    onClick={() => setPaso((actual) => actual - 1)}
                    className={styles.outline}
                    style={{ width: '35%' }}
                  >
                    Anterior
                  </button>
                )}

                <button
                  type={paso < totalPasos ? 'button' : 'submit'}
                  onClick={
                    paso < totalPasos
                      ? avanzarPaso
                      : handleSubmitClick
                  }
                  className={styles.submit}
                  style={{
                    width: paso === 1 ? '100%' : '65%',
                  }}
                  disabled={isSubmitting}
                >
                  {paso < totalPasos
                    ? 'Siguiente'
                    : isSubmitting
                      ? 'Enviando solicitud…'
                      : 'Enviar solicitud'}
                </button>
              </div>
            </fieldset>
          </Form>
        );
      }}
    </Formik>
  );
}
