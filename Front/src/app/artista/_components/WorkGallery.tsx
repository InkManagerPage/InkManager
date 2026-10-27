'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Modal from 'react-bootstrap/Modal';
import {
  cambiarEstadoTrabajo,
  eliminarTrabajo,
  obtenerEstilos,
  obtenerMisTrabajos,
} from '@/services/artistas.service';
import type { TrabajoArtista } from '@/types/artista';
import { WorkForm } from './WorkForm';
import styles from './panel.module.css';

export function WorkGallery() {
  const [trabajos, setTrabajos] = useState<TrabajoArtista[]>([]);
  const [estilos, setEstilos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [filtro, setFiltro] = useState('TODOS');
  const [formulario, setFormulario] = useState<{ trabajo: TrabajoArtista | null } | null>(null);
  const [borrando, setBorrando] = useState<TrabajoArtista | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([obtenerMisTrabajos(controller.signal), obtenerEstilos(controller.signal)])
      .then(([lista, opciones]) => {
        setTrabajos(lista);
        setEstilos(opciones);
        setError('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'No pudimos cargar tu portafolio.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [intento]);
  function actualizar(trabajo: TrabajoArtista) {
    setTrabajos((actuales) =>
      actuales.some((item) => item.id === trabajo.id)
        ? actuales.map((item) => (item.id === trabajo.id ? trabajo : item))
        : [trabajo, ...actuales],
    );
    setFormulario(null);
    setMensaje(trabajo.estado === 'PUBLICADO' ? 'Trabajo publicado.' : 'Borrador guardado.');
  }
  async function cambiarEstado(trabajo: TrabajoArtista) {
    setOcupado(trabajo.id);
    setError('');
    try {
      actualizar(await cambiarEstadoTrabajo(trabajo));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cambiar la publicación.');
    } finally {
      setOcupado(null);
    }
  }
  async function borrar() {
    if (!borrando) return;
    setOcupado(borrando.id);
    setError('');
    try {
      await eliminarTrabajo(borrando.id);
      setTrabajos((actuales) => actuales.filter((item) => item.id !== borrando.id));
      setBorrando(null);
      setMensaje('Trabajo eliminado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos eliminar el trabajo.');
    } finally {
      setOcupado(null);
    }
  }
  const visibles = trabajos.filter((trabajo) => filtro === 'TODOS' || trabajo.estado === filtro);
  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>Mis trabajos</h1>
        </div>
        <button
          className="btn btn-dark"
          onClick={() => {
            setMensaje('');
            setFormulario({ trabajo: null });
          }}
          disabled={cargando || !estilos.length}
        >
          + Nuevo trabajo
        </button>
      </header>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}{' '}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={() => {
              setCargando(true);
              setIntento((valor) => valor + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {mensaje && (
        <p role="status" className={styles.feedback}>
          {mensaje}
        </p>
      )}
      <div className={styles.toolbar}>
        <div className="btn-group" role="group" aria-label="Estado de los trabajos">
          {(
            [
              ['TODOS', 'Todos'],
              ['BORRADOR', 'Borradores'],
              ['PUBLICADO', 'Publicados'],
            ] as const
          ).map(([valor, nombre]) => (
            <button
              key={valor}
              type="button"
              className={`btn btn-sm ${filtro === valor ? 'btn-dark' : 'btn-outline-secondary'}`}
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {nombre}
            </button>
          ))}
        </div>
        <span>
          {trabajos.length} {trabajos.length === 1 ? 'trabajo' : 'trabajos'}
        </span>
      </div>
      {cargando ? (
        <p role="status">Cargando tus trabajos…</p>
      ) : !visibles.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            ＋
          </span>
          <h2>
            {trabajos.length ? 'No hay trabajos en este estado' : 'Todavía no tenés trabajos'}
          </h2>
          {!trabajos.length && (
            <button
              type="button"
              className="btn btn-outline-dark"
              disabled={!estilos.length}
              onClick={() => setFormulario({ trabajo: null })}
            >
              Cargar mi primer trabajo
            </button>
          )}
        </div>
      ) : (
        <div className={styles.workGrid}>
          {visibles.map((trabajo) => (
            <article className={styles.workCard} key={trabajo.id}>
              <div className={styles.workImage}>
                {trabajo.url ? (
                  <Image
                    src={trabajo.url}
                    alt={trabajo.descripcion || 'Trabajo sin descripción'}
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <span>Sin foto</span>
                )}
                <span
                  className={`${styles.stateBadge} ${trabajo.estado === 'PUBLICADO' ? styles.published : ''}`}
                >
                  {trabajo.estado === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <div className={styles.workBody}>
                <p>{trabajo.descripcion || 'Sin descripción'}</p>
                <div className={styles.tags}>
                  {trabajo.estilos.map((estilo) => (
                    <span key={estilo}>{estilo}</span>
                  ))}
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark"
                    disabled={ocupado === trabajo.id}
                    onClick={() => setFormulario({ trabajo })}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    disabled={ocupado === trabajo.id}
                    onClick={() => void cambiarEstado(trabajo)}
                  >
                    {trabajo.estado === 'PUBLICADO' ? 'Pasar a borrador' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={ocupado === trabajo.id}
                    onClick={() => {
                      setError('');
                      setBorrando(trabajo);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {formulario && (
        <WorkForm
          trabajo={formulario.trabajo}
          estilos={estilos}
          onHide={() => setFormulario(null)}
          onSaved={actualizar}
        />
      )}
      <Modal
        show={Boolean(borrando)}
        onHide={ocupado ? () => {} : () => setBorrando(null)}
        centered
        aria-labelledby="delete-work-title"
      >
        <Modal.Header closeButton={!ocupado} closeLabel="Cerrar">
          <Modal.Title id="delete-work-title">Eliminar trabajo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <p className="alert alert-danger" role="alert">
              {error}
            </p>
          )}
          Se eliminarán el trabajo y su foto del portafolio. Esta acción no se puede deshacer.
        </Modal.Body>
        <Modal.Footer>
          <button
            className="btn btn-outline-dark"
            disabled={Boolean(ocupado)}
            onClick={() => setBorrando(null)}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            disabled={Boolean(ocupado)}
            onClick={() => void borrar()}
          >
            {ocupado ? 'Eliminando…' : 'Eliminar trabajo'}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
