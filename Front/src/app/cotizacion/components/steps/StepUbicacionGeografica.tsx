'use client';

import { useState, useEffect } from 'react';
import type { PasoCotizacionProps, ResultadoArtistasCercanos } from '@/types/cotizacion';
import { consultarArtistasCercanos } from '@/services/cotizacion.service';
import styles from '../cotizacion.module.css';

const ciudadesPrueba = [
  { nombre: 'La Plata, Buenos Aires', lat: -34.9214, lng: -57.9545 },
  { nombre: 'Buenos Aires (CABA), Argentina', lat: -34.6131, lng: -58.3772 },
  { nombre: 'Córdoba, Argentina', lat: -31.4135, lng: -64.181 },
  { nombre: 'Rosario, Argentina', lat: -32.9468, lng: -60.6393 },
  { nombre: 'Madrid, España', lat: 40.4165, lng: -3.7026 },
  { nombre: 'Barcelona, España', lat: 41.3888, lng: 2.159 },
  { nombre: 'Ciudad de México, México', lat: 19.4285, lng: -99.1277 },
  { nombre: 'Santiago, Chile', lat: -33.4569, lng: -70.6483 },
  { nombre: 'Bogotá, Colombia', lat: 4.6126, lng: -74.0705 },
  { nombre: 'Montevideo, Uruguay', lat: -34.9033, lng: -56.1882 },
];

export function StepUbicacionGeografica({ values, setFieldValue }: PasoCotizacionProps) {
  const [geolocalizando, setGeolocalizando] = useState(false);
  const [errorGeo, setErrorGeo] = useState('');
  const [cargandoArtistas, setCargandoArtistas] = useState(false);
  const [resultado, setResultado] = useState<ResultadoArtistasCercanos | null>(null);

  function obtenerUbicacionNavegador() {
    setErrorGeo('');
    if (!navigator.geolocation) {
      setErrorGeo('Tu navegador no soporta geolocalización. Seleccioná una ciudad de la lista.');
      return;
    }

    setGeolocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocalizando(false);
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setFieldValue('latitud', lat);
        setFieldValue('longitud', lng);
        setFieldValue('nombreUbicacion', 'Ubicación actual detectada');
      },
      (err) => {
        setGeolocalizando(false);
        setErrorGeo(
          err.code === 1
            ? 'Permiso denegado para acceder a tu ubicación. Podés elegir una ciudad de la lista.'
            : 'No pudimos obtener tu ubicación precisa. Podés elegir una ciudad de la lista.',
        );
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function seleccionarCiudad(ciudad: (typeof ciudadesPrueba)[number]) {
    setErrorGeo('');
    setFieldValue('latitud', ciudad.lat);
    setFieldValue('longitud', ciudad.lng);
    setFieldValue('nombreUbicacion', ciudad.nombre);
  }

  const radioActual = values.radioKm || 80;

  function cambiarRadio(nuevoRadio: number) {
    setFieldValue('radioKm', nuevoRadio);
  }

  // Consultar artistas cercanos cada vez que cambien lat/lng, estilo o radio
  useEffect(() => {
    if (typeof values.latitud !== 'number' || typeof values.longitud !== 'number') return;

    let activo = true;
    setCargandoArtistas(true);

    consultarArtistasCercanos(values.latitud, values.longitud, values.estilo, radioActual)
      .then((data) => {
        if (activo) {
          setResultado(data);
          setCargandoArtistas(false);
        }
      })
      .catch(() => {
        if (activo) setCargandoArtistas(false);
      });

    return () => {
      activo = false;
    };
  }, [values.latitud, values.longitud, values.estilo, radioActual]);

  const tieneUbicacion = typeof values.latitud === 'number' && typeof values.longitud === 'number';

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <p style={{ margin: 0, color: '#555' }}>
        Indicá tu zona para que tu cotización llegue a los artistas más cercanos a vos y podamos
        identificar al <strong>artista ideal</strong> para tu diseño en{' '}
        <strong>{values.estilo || 'tu estilo elegido'}</strong>.
      </p>

      {/* Selector de radio de búsqueda */}
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
          Radio de búsqueda: <strong>{radioActual} km</strong>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[30, 50, 80, 120].map((r) => {
            const activo = radioActual === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => cambiarRadio(r)}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: activo ? '2px solid #111' : '1px solid #ddd',
                  background: activo ? '#111' : '#fff',
                  color: activo ? '#fff' : '#333',
                  fontWeight: activo ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {r} km {r === 80 ? '(Recomendado)' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón de Geolocalización Nativa */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={obtenerUbicacionNavegador}
          disabled={geolocalizando}
          className={styles.botonEnviar}
          style={{
            cursor: geolocalizando ? 'wait' : 'pointer',
            padding: '0.75rem 1.25rem',
            background: '#111',
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          {geolocalizando ? '⏳ Detectando tu ubicación…' : '📍 Usar mi ubicación actual'}
        </button>

        {tieneUbicacion && (
          <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>
            ✓ {values.nombreUbicacion || 'Ubicación fijada'} ({values.latitud}, {values.longitud})
          </span>
        )}
      </div>

      {errorGeo && (
        <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }} role="alert">
          {errorGeo}
        </p>
      )}

      {/* Selector rápido para pruebas en distintas ubicaciones */}
      <details style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#333' }}>
          O seleccioná una ciudad para la prueba (Argentina, España, México, etc.)
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
          {ciudadesPrueba.map((ciudad) => {
            const esSeleccionada =
              values.latitud === ciudad.lat && values.longitud === ciudad.lng;
            return (
              <button
                key={ciudad.nombre}
                type="button"
                onClick={() => seleccionarCiudad(ciudad)}
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: esSeleccionada ? '2px solid #111' : '1px solid #ddd',
                  background: esSeleccionada ? '#f3f4f6' : '#fff',
                  fontWeight: esSeleccionada ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {ciudad.nombre}
              </button>
            );
          })}
        </div>
      </details>

      {/* Visualización de Artistas Ideales y Cercanos en tiempo real */}
      {cargandoArtistas && (
        <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
          Buscando artistas cercanos en tu zona…
        </p>
      )}

      {resultado && !cargandoArtistas && (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
          {/* Sección Artistas Ideales */}
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111' }}>
              <span>🎯</span> Artistas Ideales para tu diseño ({resultado.artistasIdeales.length})
            </h3>
            {resultado.artistasIdeales.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {resultado.artistasIdeales.map((artista) => (
                  <div
                    key={artista.id}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#166534' }}>
                        {artista.nombreArtistico || artista.nombre}
                        {artista.estudio && (
                          <span style={{ fontWeight: 400, color: '#15803d', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                            ({artista.estudio.nombre})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.2rem' }}>
                        Especialista en: {artista.estilosPrincipales.join(', ')}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      A {artista.distanciaKm} km
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                No encontramos especialistas exclusivos en {values.estilo} en esta zona, pero los artistas cercanos recibirán igualmente tu solicitud.
              </p>
            )}
          </div>

          {/* Sección Otros Artistas Cercanos */}
          {resultado.otrosArtistasCercanos.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem', color: '#444' }}>
                📍 Otros tatuadores cercanos que también recibirán tu cotización ({resultado.otrosArtistasCercanos.length})
              </h4>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                {resultado.otrosArtistasCercanos.map((artista) => (
                  <div
                    key={artista.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>
                      <strong>{artista.nombreArtistico || artista.nombre}</strong>
                      {artista.estudio && (
                        <span style={{ color: '#666', marginLeft: '0.4rem' }}>
                          · {artista.estudio.nombre}
                        </span>
                      )}
                    </span>
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>
                      A {artista.distanciaKm} km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            ℹ️ Tu cotización llegará a todos los artistas cercanos ({resultado.totalCercanos} en total), priorizando a los especialistas para que te brinden la mejor propuesta.
          </p>
        </div>
      )}
    </div>
  );
}
