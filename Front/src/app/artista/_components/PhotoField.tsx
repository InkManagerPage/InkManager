'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { comprimirImagen } from '@/lib/comprimir-imagen';
import styles from './panel.module.css';

export function PhotoField({
  id,
  label,
  actual,
  onChange,
  onProcessing,
}: {
  id: string;
  label: string;
  actual?: string | null;
  onChange: (file: File | null) => void;
  onProcessing: (procesando: boolean) => void;
}) {
  const [preview, setPreview] = useState(actual || '');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  useEffect(
    () => () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <div className={styles.photoField}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {preview && (
        <div className={styles.photoPreview}>
          <Image
            src={preview}
            alt={`Vista previa: ${label.toLowerCase()}`}
            width={440}
            height={300}
            unoptimized
          />
        </div>
      )}
      <input
        className="form-control"
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={procesando}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = event.target.files?.[0] ?? null;
          setError('');
          onChange(null);
          if (!file) {
            setPreview(actual || '');
            return;
          }
          setProcesando(true);
          onProcessing(true);
          try {
            const foto = await comprimirImagen(file);
            onChange(foto);
            setPreview(URL.createObjectURL(foto));
          } catch (cause) {
            input.value = '';
            setPreview(actual || '');
            setError(cause instanceof Error ? cause.message : 'No pudimos preparar la foto.');
          } finally {
            setProcesando(false);
            onProcessing(false);
          }
        }}
      />
      <small id={`${id}-hint`} className="text-secondary d-block mt-2">
        JPG, PNG o WebP · Máximo 2 MB después de optimizar.
      </small>
      {procesando && (
        <p role="status" className="small mt-2">
          Optimizando foto…
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
