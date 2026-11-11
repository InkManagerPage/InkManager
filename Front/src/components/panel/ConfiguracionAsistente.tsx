'use client';

import Link from 'next/link';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useFormikContext } from 'formik';
import { apiFetch } from '@/lib/api-client';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import { PageHeader } from './PanelUI';
import { PanelField, PanelForm, PanelSubmitButton } from './PanelForm';
import styles from './workspace.module.css';

const ruta = '/asistente/configuracion';
type Archivo = { contenido: string };
type Respuesta = { configuracion: unknown; pruebaDisponible: boolean };
const acciones = {
  RESPONDER: 'Responder en el chat',
  FORMULARIO: 'Compartir el formulario',
  ESTADO: 'Consultar el estado',
  TURNO: 'Coordinar un turno con el equipo',
  DERIVAR: 'Derivar al equipo',
};
type VistaPrevia = {
  accion: keyof typeof acciones;
  texto: string;
  enlaceFormulario: string | null;
};

function leerJson(contenido: string): unknown {
  try {
    return JSON.parse(contenido.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Revisá el formato JSON del archivo.');
  }
}

function AccionesArchivo() {
  const { values, setFieldValue } = useFormikContext<Archivo>();
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function importar(evento: ChangeEvent<HTMLInputElement>) {
    const input = evento.currentTarget;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    setError('');
    setAviso('');
    try {
      if (archivo.size > 96 * 1024) throw new Error('Elegí un archivo JSON de hasta 96 KB.');
      const datos = leerJson(await archivo.text());
      await setFieldValue('contenido', JSON.stringify(datos, null, 2));
      setAviso('Archivo cargado. Guardá para aplicar los cambios a tu configuración.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos leer el archivo.');
    }
  }

  function descargar() {
    setError('');
    try {
      const datos = leerJson(values.contenido);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(datos, null, 2)], {
          type: 'application/json',
        }),
      );
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'configuracion-asistente.json';
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos descargar el archivo.');
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-3 align-items-end">
        <div>
          <label className="form-label" htmlFor="asistente-archivo">
            Importar archivo JSON
          </label>
          <input
            id="asistente-archivo"
            type="file"
            accept=".json,application/json"
            className="form-control"
            onChange={(evento) => void importar(evento)}
          />
        </div>
        <button type="button" className={styles.secondaryButton} onClick={descargar}>
          Descargar JSON
        </button>
      </div>
      {error && (
        <p role="alert" className="text-danger mt-2">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="mt-2">
          {aviso}
        </p>
      )}
    </>
  );
}

function PruebaAsistente({ disponible }: { disponible: boolean }) {
  const [mensaje, setMensaje] = useState('');
  const [respuesta, setRespuesta] = useState<VistaPrevia | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function probar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!disponible || ocupado || !mensaje.trim()) return;
    setOcupado(true);
    setRespuesta(null);
    setError('');
    try {
      const resultado = await mutarPanel('/asistente/prueba', 'POST', { mensaje });
      setRespuesta((await resultado.json()) as VistaPrevia);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos generar una respuesta.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-5" aria-labelledby="asistente-prueba-titulo">
      <h2 id="asistente-prueba-titulo" className="h4">
        Probar asistente
      </h2>
      <p>Simulá un mensaje de Instagram con la última configuración guardada.</p>
      {disponible ? (
        <form onSubmit={(evento) => void probar(evento)}>
          <label className="form-label" htmlFor="asistente-prueba-mensaje">
            Mensaje de ejemplo
          </label>
          <textarea
            id="asistente-prueba-mensaje"
            className="form-control"
            value={mensaje}
            onChange={(evento) => setMensaje(evento.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Buenas, tengo una idea para tatuarme. ¿Cómo les pido un presupuesto?"
            disabled={ocupado}
            required
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.button} disabled={ocupado || !mensaje.trim()}>
              {ocupado ? 'Generando respuesta…' : 'Probar mensaje'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-danger mt-3">
              {error}
            </p>
          )}
          <div aria-live="polite" aria-busy={ocupado}>
            {respuesta && (
              <div className={`${styles.surface} p-3 mt-3`}>
                <h3 className="h6">{acciones[respuesta.accion]}</h3>
                <p className="mb-0">{respuesta.texto}</p>
                {respuesta.enlaceFormulario && (
                  <Link href={respuesta.enlaceFormulario}>Ver formulario</Link>
                )}
              </div>
            )}
          </div>
        </form>
      ) : (
        <p role="status">Para probar respuestas, configurá la clave de Groq en el backend.</p>
      )}
    </section>
  );
}

export function ConfiguracionAsistente({ volver }: { volver: string }) {
  const { datos, error, cargando } = usePanelData<Respuesta>(ruta);
  const [guardado, setGuardado] = useState(false);
  return (
    <>
      <PageHeader titulo="Configuración del asistente">
        <Link href={volver} className={styles.secondaryButton}>
          Volver a configuración
        </Link>
      </PageHeader>
      {cargando && <p role="status">Cargando configuración…</p>}
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {datos && (
        <>
          <PanelForm<Archivo>
            initialValues={{ contenido: JSON.stringify(datos.configuracion, null, 2) }}
            validate={({ contenido }) => {
              try {
                leerJson(contenido);
                return {};
              } catch {
                return { contenido: 'Ingresá un documento JSON válido.' };
              }
            }}
            onSave={async ({ contenido }) => {
              setGuardado(false);
              await apiFetch(ruta, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leerJson(contenido)),
              });
            }}
            onSaved={() => setGuardado(true)}
          >
            <PanelField
              name="contenido"
              label="Configuración JSON"
              as="textarea"
              rows={17}
              hint="Definí el tono, los servicios, las políticas, las respuestas frecuentes y cuándo derivar."
              required
            />
            <AccionesArchivo />
            <div className={styles.formActions}>
              <PanelSubmitButton>Guardar configuración</PanelSubmitButton>
            </div>
          </PanelForm>
          {guardado && (
            <p role="status" className="mt-2">
              Configuración del asistente guardada.
            </p>
          )}
          <PruebaAsistente disponible={datos.pruebaDisponible} />
        </>
      )}
    </>
  );
}
