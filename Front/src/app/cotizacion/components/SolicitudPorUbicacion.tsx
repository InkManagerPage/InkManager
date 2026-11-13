'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { CotizacionForm } from '@/components/forms/CotizacionForm';
import { crearSolicitudPorUbicacion } from '@/services/cotizacion.service';
import type { CotizacionValues, RespuestaEnvioCercanas } from '@/types/cotizacion';
import styles from './cotizacion.module.css';

export function SolicitudPorUbicacion() {
  const claveEnvio = useRef<string>(null);
  const [enviada, setEnviada] = useState(false);
  const [respuesta, setRespuesta] = useState<RespuestaEnvioCercanas | null>(null);
  const [error, setError] = useState('');

  async function enviar(values: CotizacionValues) {
    setError('');
    try {
      claveEnvio.current ??= crypto.randomUUID();
      const res = await crearSolicitudPorUbicacion(values, claveEnvio.current);
      setRespuesta(res);
      setEnviada(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos enviar tu consulta a los artistas cercanos.',
      );
    }
  }

  return enviada && respuesta ? (
    <div role="status" style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h2 className={styles.pasoTitulo} style={{ color: '#166534', margin: '0 0 0.5rem' }}>
          ✓ ¡Consulta enviada con éxito!
        </h2>
        <p style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
          Tu solicitud fue distribuida a{' '}
          <strong>{respuesta.totalNotificados} artistas</strong> cercanos a tu ubicación.
        </p>
      </div>

      {/* Artistas Ideales */}
      {respuesta.artistasIdeales.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯</span> Artistas Ideales recomendados para tu diseño ({respuesta.artistasIdeales.length})
          </h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#15803d' }}>
            Estos tatuadores están en tu zona y se especializan exactamente en el estilo que pediste:
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {respuesta.artistasIdeales.map((artista) => (
              <div
                key={artista.id}
                style={{
                  background: '#fff',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#111' }}>
                    {artista.nombreArtistico || artista.nombre}
                    {artista.estudio && (
                      <span style={{ fontWeight: 400, color: '#666', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                        · {artista.estudio.nombre}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.2rem' }}>
                    Especialista en: {artista.estilosPrincipales.join(', ')}
                  </div>
                </div>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    padding: '0.3rem 0.6rem',
                    borderRadius: '999px',
                  }}
                >
                  A {artista.distanciaKm} km
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Otros Artistas Cercanos */}
      {respuesta.otrosArtistasCercanos.length > 0 && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#374151' }}>
            📍 Otros artistas cercanos que también recibieron tu consulta ({respuesta.otrosArtistasCercanos.length})
          </h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {respuesta.otrosArtistasCercanos.map((artista) => (
              <div
                key={artista.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
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
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  A {artista.distanciaKm} km
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link
          href="/clientes"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#111',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          ← Volver a explorar trabajos
        </Link>
      </div>
    </div>
  ) : (
    <CotizacionForm onSubmit={enviar} error={error} porUbicacion />
  );
}
