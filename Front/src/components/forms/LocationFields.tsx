'use client';

import { useEffect, useState } from 'react';
import { obtenerPaises, obtenerProvincias, obtenerCiudades } from '@/services/ubicaciones.service';
import type { Pais, OpcionUbicacion } from '@/types/ubicaciones';

export function LocationFields({
  paisActual,
  provinciaActual,
  ciudadId,
  ciudadAnterior,
  onChange,
}: {
  paisActual: string | null;
  provinciaActual: number | null;
  ciudadId: number | null;
  ciudadAnterior?: string | null;
  onChange: (id: number | null) => void;
}) {
  const [pais, setPais] = useState(paisActual || 'AR');
  const [provincia, setProvincia] = useState(provinciaActual ? String(provinciaActual) : '');
  const [paises, setPaises] = useState<Pais[]>([]);
  const [provincias, setProvincias] = useState<{ pais: string; lista: OpcionUbicacion[] }>({
    pais: '',
    lista: [],
  });
  const [ciudades, setCiudades] = useState<{ clave: string; lista: OpcionUbicacion[] }>({
    clave: '',
    lista: [],
  });
  const [errorPaises, setErrorPaises] = useState('');
  const [errorProvincias, setErrorProvincias] = useState('');
  const [errorCiudades, setErrorCiudades] = useState('');
  const error = errorPaises || errorProvincias || errorCiudades;
  const [intento, setIntento] = useState(0);
  const clave = `${pais}/${provincia}`;

  useEffect(() => {
    const controller = new AbortController();
    obtenerPaises(controller.signal)
      .then((lista) => {
        setPaises(lista);
        setErrorPaises('');
        if (!paisActual) {
          try {
            const preferido = localStorage.getItem('inkmanager-pais');
            if (preferido && lista.some((item) => item.codigo === preferido)) setPais(preferido);
          } catch {
            /* La elección funciona aunque el navegador bloquee el almacenamiento. */
          }
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrorPaises(cause instanceof Error ? cause.message : 'No pudimos cargar los países.');
      });
    return () => controller.abort();
  }, [paisActual, intento]);

  useEffect(() => {
    const controller = new AbortController();
    obtenerProvincias(pais, controller.signal)
      .then((lista) => {
        setProvincias({ pais, lista });
        setErrorProvincias('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrorProvincias(
            cause instanceof Error ? cause.message : 'No pudimos cargar las provincias.',
          );
      });
    return () => controller.abort();
  }, [pais, intento]);

  useEffect(() => {
    if (!provincia) return;
    const controller = new AbortController();
    obtenerCiudades(pais, provincia, controller.signal)
      .then((lista) => {
        setCiudades({ clave, lista });
        setErrorCiudades('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setErrorCiudades(
            cause instanceof Error ? cause.message : 'No pudimos cargar las ciudades.',
          );
      });
    return () => controller.abort();
  }, [pais, provincia, clave, intento]);

  return (
    <fieldset className="mb-4">
      <legend className="visually-hidden">Ubicación</legend>
      <div className="row g-3">
        <div className="col-sm-6">
          <label className="form-label" htmlFor="artist-country">
            País
          </label>
          <select
            id="artist-country"
            className="form-select"
            value={pais}
            disabled={!paises.length}
            onChange={(event) => {
              const codigo = event.target.value;
              setPais(codigo);
              setProvincia('');
              onChange(null);
              setErrorProvincias('');
              setErrorCiudades('');
              try {
                localStorage.setItem('inkmanager-pais', codigo);
              } catch {
                /* Preferencia opcional. */
              }
            }}
          >
            {!paises.length && <option value={pais}>Cargando países…</option>}
            {paises.map((opcion) => (
              <option key={opcion.codigo} value={opcion.codigo}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor="artist-state">
            Provincia o estado
          </label>
          <select
            id="artist-state"
            className="form-select"
            value={provincia}
            disabled={provincias.pais !== pais}
            onChange={(event) => {
              setProvincia(event.target.value);
              onChange(null);
              setErrorCiudades('');
            }}
          >
            <option value="">
              {provincias.pais === pais ? 'Elegí una provincia' : 'Cargando provincias…'}
            </option>
            {provincias.pais === pais &&
              provincias.lista.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre}
                </option>
              ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="artist-city">
            Ciudad
          </label>
          <select
            id="artist-city"
            className="form-select"
            value={ciudadId ?? ''}
            disabled={!provincia || ciudades.clave !== clave}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">
              {!provincia
                ? 'Elegí una provincia primero'
                : ciudades.clave !== clave
                  ? 'Cargando ciudades…'
                  : 'Elegí una ciudad'}
            </option>
            {ciudades.clave === clave &&
              ciudades.lista.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre}
                </option>
              ))}
          </select>
          {!ciudadId && ciudadAnterior && (
            <small className="text-secondary">Ubicación anterior: {ciudadAnterior}</small>
          )}
          {provincia && ciudades.clave === clave && !ciudades.lista.length && (
            <small className="text-secondary">No hay ciudades disponibles en esta provincia.</small>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-danger small mt-2">
          {error}{' '}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setIntento((valor) => valor + 1)}
          >
            Reintentar
          </button>
        </p>
      )}
      <small className="d-block mt-2">
        <a
          className="text-secondary"
          href="https://github.com/dr5hn/countries-states-cities-database"
          target="_blank"
          rel="noreferrer"
        >
          Datos de ubicaciones
        </a>
      </small>
    </fieldset>
  );
}
