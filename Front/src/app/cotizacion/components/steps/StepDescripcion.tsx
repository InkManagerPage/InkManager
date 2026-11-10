import { useRef } from 'react';
import type { PasoCotizacionProps } from '@/types/cotizacion';
import { descripcionValida } from '@/lib/descripcion-tatuaje';
import styles from '../cotizacion.module.css';

export function StepDescripcion({ values, setFieldValue }: PasoCotizacionProps) {
  const referencia = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.campos}>
      <div>
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          rows={5}
          maxLength={1500}
          value={values.descripcion}
          aria-describedby="contador-descripcion"
          onChange={(evento) => setFieldValue('descripcion', evento.target.value)}
          placeholder="Por ejemplo, una rama de olivo en el antebrazo con trazo fino."
          className={styles.campo}
          required
        />
        <p
          id="contador-descripcion"
          className={styles.contador}
          data-valido={descripcionValida(values.descripcion)}
        >
          {values.descripcion.trim().length} / 20 caracteres mínimos
        </p>
      </div>
      <div>
        <label htmlFor="referencia">
          Imagen de referencia <span>(opcional)</span>
        </label>
        <input
          id="referencia"
          ref={referencia}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="form-control"
          onChange={(evento) =>
            setFieldValue('imagenReferencia', evento.currentTarget.files?.[0] ?? null)
          }
        />
        {values.imagenReferencia && (
          <p className={styles.archivo}>
            <span>{values.imagenReferencia.name}</span>
            <button
              type="button"
              className={styles.secundario}
              onClick={() => {
                setFieldValue('imagenReferencia', null);
                if (referencia.current) referencia.current.value = '';
              }}
            >
              Quitar
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
