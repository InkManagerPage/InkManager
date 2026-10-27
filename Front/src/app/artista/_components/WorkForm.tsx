'use client';

import { useState, type FormEvent } from 'react';
import Modal from 'react-bootstrap/Modal';
import { guardarTrabajo } from '@/services/artistas.service';
import type { TrabajoArtista } from '@/types/artista';
import { StylePicker } from './StylePicker';
import { PhotoField } from './PhotoField';
import styles from './panel.module.css';

export function WorkForm({
  trabajo,
  estilos,
  onHide,
  onSaved,
}: {
  trabajo: TrabajoArtista | null;
  estilos: string[];
  onHide: () => void;
  onSaved: (trabajo: TrabajoArtista) => void;
}) {
  const [descripcion, setDescripcion] = useState(trabajo?.descripcion || '');
  const [seleccionados, setSeleccionados] = useState(trabajo?.estilos || []);
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  async function guardar(estado: TrabajoArtista['estado']) {
    if (procesando || enviando) return;
    setError('');
    if (
      estado === 'PUBLICADO' &&
      (!descripcion.trim() || !seleccionados.length || (!foto && !trabajo?.url))
    ) {
      setError('Para publicar necesitás una foto, descripción y al menos un estilo.');
      return;
    }
    const datos = new FormData();
    datos.set('descripcion', descripcion.trim());
    datos.set('estilos', JSON.stringify(seleccionados));
    datos.set('estado', estado);
    if (foto) datos.set('imagen', foto);
    setEnviando(true);
    try {
      onSaved(await guardarTrabajo(datos, trabajo?.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar el trabajo.');
    } finally {
      setEnviando(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void guardar(trabajo?.estado ?? 'BORRADOR');
  }
  return (
    <Modal
      show
      onHide={enviando || procesando ? () => {} : onHide}
      centered
      scrollable
      backdrop={enviando ? 'static' : true}
      aria-labelledby="work-form-title"
    >
      <Modal.Header closeButton={!enviando && !procesando} closeLabel="Cerrar">
        <Modal.Title id="work-form-title">
          {trabajo ? 'Editar trabajo' : 'Nuevo trabajo'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form id="work-form" onSubmit={submit}>
          <fieldset disabled={enviando}>
            <PhotoField
              id="work-photo"
              label="Foto del trabajo"
              actual={trabajo?.url}
              onChange={setFoto}
              onProcessing={setProcesando}
            />
            <div className="my-4">
              <label htmlFor="work-description" className="form-label">
                Descripción
              </label>
              <textarea
                id="work-description"
                className="form-control"
                rows={3}
                maxLength={1200}
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Contá qué hiciste en este tatuaje."
              />
              <small className="text-secondary">{descripcion.length}/1200</small>
            </div>
            <StylePicker
              opciones={estilos}
              seleccionados={seleccionados}
              onChange={setSeleccionados}
            />
            {error && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                {error}
              </div>
            )}
          </fieldset>
        </form>
      </Modal.Body>
      <Modal.Footer className={styles.formFooter}>
        <button
          type="button"
          className="btn btn-outline-dark"
          disabled={enviando || procesando}
          onClick={() => void guardar('BORRADOR')}
        >
          {trabajo?.estado === 'PUBLICADO' ? 'Guardar como borrador' : 'Guardar borrador'}
        </button>
        <button
          type="button"
          className="btn btn-dark"
          disabled={enviando || procesando}
          onClick={() => void guardar('PUBLICADO')}
        >
          {enviando
            ? 'Guardando…'
            : trabajo?.estado === 'PUBLICADO'
              ? 'Guardar y publicar'
              : 'Publicar trabajo'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
