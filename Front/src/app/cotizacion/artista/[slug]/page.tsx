'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '@/store/AuthProvider';
import { AuthControls } from '@/components/auth/AuthControls';
import { CotizacionForm } from '@/components/forms/CotizacionForm';
import { crearSolicitudParaArtista } from '@/services/cotizacion.service';

import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

export default function SolicitudArtistaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const {
    usuario,
    cargando,
    error: errorSesion,
    reintentar,
  } = useAuth();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit(values: CotizacionValues) {
    setError('');
    setSuccess(false);

    try {
      await crearSolicitudParaArtista(values, slug);
      setSuccess(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos enviar la solicitud.',
      );
    }
  }

  return (
    <main className={styles.accountPage}>
      <div className={styles.accountCard} style={{ maxWidth: '600px' }}>
        <div className="mb-6">
          <Link
            href="/"
            className={styles.eyebrow}
            style={{
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            ← Volver a InkManager
          </Link>

          <h1
            style={{
              fontSize: '34px',
              fontWeight: 500,
              letterSpacing: '-1.3px',
              margin: '0 0 10px',
            }}
          >
            Solicitar presupuesto.
          </h1>

          <p className={styles.intro}>
            Cuéntanos los detalles de tu próximo tatuaje paso a paso.
          </p>
        </div>

        {cargando ? (
          <p role="status">Comprobando tu sesión...</p>
        ) : errorSesion ? (
          <div role="alert">
            <p>{errorSesion}</p>

            <button
              type="button"
              onClick={reintentar}
              className={styles.outline}
            >
              Reintentar
            </button>
          </div>
        ) : !usuario ? (
          <div>
            <p className={styles.intro}>
              Para enviar una solicitud, primero necesitás iniciar sesión o
              crear una cuenta en InkManager.
            </p>

            <AuthControls contextoRegistro="general" />
          </div>
        ) : usuario.rol !== 'CLIENTE' ? (
          <div>
            <p>
              Esta sección está disponible únicamente para usuarios con una
              cuenta de cliente.
            </p>

            <p>Tu sesión actual corresponde a otro tipo de cuenta.</p>
          </div>
        ) : success ? (
          <div className={styles.successPanel}>
            <div className={styles.successIcon} aria-hidden="true">
              ✓
            </div>

            <p className={styles.eyebrow}>
              Solicitud completada
            </p>

            <h2 className={styles.successTitle}>
              ¡Solicitud enviada con éxito!
            </h2>

            <p className={styles.successText}>
              El artista recibirá tu solicitud y se pondrá en contacto
              contigo a la brevedad.
            </p>

            <Link
              href="/"
              className={`${styles.submit} ${styles.successAction}`}
            >
              Ir al inicio
            </Link>
          </div>
        ) : (
          <CotizacionForm onSubmit={submit} error={error} />
        )}
      </div>
    </main>
  );
}
