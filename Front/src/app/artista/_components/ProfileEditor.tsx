'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { guardarMiPerfil, obtenerEstilos } from '@/services/artistas.service';
import { camposPendientes } from '@/lib/perfil-artista';
import type { PerfilArtista } from '@/types/artista';
import { useArtistProfile } from './ArtistProfileProvider';
import { PhotoField } from './PhotoField';
import { StylePicker } from './StylePicker';
import { LocationFields } from '@/components/forms/LocationFields';
import styles from './panel.module.css';

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
      <header className={styles.heading}>
        <h1>Mi perfil</h1>
      </header>
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

function ProfileForm({
  perfil,
  estilos,
  onSaved,
}: {
  perfil: PerfilArtista;
  estilos: string[];
  onSaved: (perfil: PerfilArtista) => void;
}) {
  const [nombre, setNombre] = useState(perfil.nombreArtistico || '');
  const [biografia, setBiografia] = useState(perfil.biografia || '');
  const [ciudadId, setCiudadId] = useState(perfil.ciudadId);
  const [seleccionados, setSeleccionados] = useState(perfil.estilosPrincipales);
  const [foto, setFoto] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);
  const faltantes = camposPendientes(perfil);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (procesando || guardando) return;
    if (perfil.ciudad && !perfil.ciudadId && !ciudadId) {
      setError('Elegí tu ciudad de la lista para guardar el perfil.');
      return;
    }
    setGuardando(true);
    setGuardado(false);
    setError('');
    const datos = new FormData();
    datos.set('nombreArtistico', nombre.trim());
    datos.set('biografia', biografia.trim());
    datos.set('ciudadId', ciudadId ? String(ciudadId) : '');
    datos.set('estilosPrincipales', JSON.stringify(seleccionados));
    if (foto) datos.set('imagen', foto);
    try {
      onSaved(await guardarMiPerfil(datos));
      setFoto(null);
      setGuardado(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu perfil.');
    } finally {
      setGuardando(false);
    }
  }
  return (
    <form className={styles.profileForm} onSubmit={guardar}>
      {faltantes.length > 0 && (
        <p className={styles.pendingFields}>Pendiente: {faltantes.join(', ')}.</p>
      )}
      <fieldset disabled={guardando}>
        <div className={styles.profileFields}>
          <PhotoField
            key={perfil.fotoPerfil || 'sin-foto'}
            id="profile-photo"
            label="Foto de perfil"
            actual={perfil.fotoPerfil}
            onChange={setFoto}
            onProcessing={setProcesando}
          />
          <div>
            <div className="mb-4">
              <label className="form-label" htmlFor="stage-name">
                Nombre artístico
              </label>
              <input
                id="stage-name"
                className="form-control"
                value={nombre}
                minLength={2}
                maxLength={50}
                autoComplete="nickname"
                onChange={(event) => setNombre(event.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="artist-bio">
                Biografía
              </label>
              <textarea
                id="artist-bio"
                className="form-control"
                rows={4}
                maxLength={300}
                value={biografia}
                aria-describedby="bio-count"
                onChange={(event) => setBiografia(event.target.value)}
              />
              <small
                id="bio-count"
                className={biografia.length > 300 ? 'text-danger' : 'text-secondary'}
              >
                {biografia.length}/300
              </small>
            </div>
            <LocationFields
              key={perfil.ciudadId ?? 'sin-ciudad'}
              paisActual={perfil.pais}
              provinciaActual={perfil.provinciaId}
              ciudadId={ciudadId}
              ciudadAnterior={!perfil.ciudadId ? perfil.ciudad : null}
              onChange={setCiudadId}
            />
            <StylePicker
              label="Estilos principales"
              opciones={estilos}
              seleccionados={seleccionados}
              onChange={setSeleccionados}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="alert alert-danger mt-4">
            {error}
          </p>
        )}
        {guardado && (
          <p role="status" className={styles.feedback}>
            Perfil guardado.
          </p>
        )}
        <button
          className="btn btn-dark mt-4"
          type="submit"
          disabled={procesando || biografia.length > 300}
        >
          {guardando ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </fieldset>
    </form>
  );
}
