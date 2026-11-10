import type { CotizacionValues } from '@/types/cotizacion';
import styles from '@/components/auth/auth.module.css';

interface StepProps {
  values: CotizacionValues;
  setFieldValue: (field: keyof CotizacionValues, value: unknown) => void;
}

export function StepDescripcion({ values, setFieldValue }: StepProps) {
  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="descripcion" className={styles.legend}>
          Descripción obligatoria de tu idea
        </label>
        <textarea
          id="descripcion"
          rows={4}
          maxLength={1500}
          value={values.descripcion}
          onChange={(e) => setFieldValue('descripcion', e.target.value)}
          placeholder="Cuéntanos los detalles, elementos principales y significado..."
          className={`form-control ${styles.input}`}
          style={{ width: '100%', padding: '12px', resize: 'none', borderRadius: '8px' }}
          required
        />
      </div>
      <div className={styles.field} style={{ marginTop: '16px' }}>
        <label htmlFor="referencia" className={styles.legend}>
          Imagen de referencia (opcional)
        </label>
        <input
          id="referencia"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFieldValue('imagenReferencia', e.currentTarget.files?.[0] ?? null)}
          className={`form-control ${styles.input}`}
          style={{ width: '100%' }}
        />
        {values.imagenReferencia && (
          <p style={{ fontSize: '12px', color: '#30442a', marginTop: '6px', fontWeight: 500 }}>
            {values.imagenReferencia.name}{' '}
            <button
              type="button"
              className="btn btn-link btn-sm"
              onClick={() => {
                setFieldValue('imagenReferencia', null);
                const campo = document.getElementById('referencia');
                if (campo instanceof HTMLInputElement) campo.value = '';
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
