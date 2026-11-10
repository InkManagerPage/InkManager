'use client';

import { useEffect, useState } from 'react';
import type { PasoCotizacionProps } from '@/types/cotizacion';
import { apiFetch } from '@/lib/api-client';
import { OpcionesConFoto } from '../OpcionesConFoto';
import styles from '../cotizacion.module.css';

const fotos: Record<string, string> = {
  'Arte Clásico': 'newAge',
  Blackwork: 'blackwork',
  'Fine Line': 'fineLine',
  Geométrico: 'other',
  Ilustrativo: 'surrealism',
  Japonés: 'japanese',
  Neotradicional: 'neoTraditional',
  Ornamental: 'ornamental',
  Realismo: 'realism',
  Tradicional: 'traditional',
};

export function StepEstilo({ values, setFieldValue }: PasoCotizacionProps) {
  const [catalogo, setCatalogo] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controlador = new AbortController();
    void apiFetch('/estilos', { signal: controlador.signal })
      .then((res) => res.json())
      .then((estilos) => {
        if (!controlador.signal.aborted) setCatalogo(estilos);
      })
      .catch(() => {
        if (!controlador.signal.aborted) setError(true);
      });
    return () => controlador.abort();
  }, []);

  if (error)
    return (
      <p role="alert">No pudimos cargar los estilos. Volvé al paso anterior e intentá de nuevo.</p>
    );
  if (!catalogo) return <p role="status">Cargando estilos…</p>;
  const carpeta = values.esColor ? 'color' : 'negro-y-gris';
  const conFoto = catalogo
    .filter((estilo) => Object.hasOwn(fotos, estilo))
    .map((estilo) => ({
      valor: estilo,
      foto: `/images/cotizacion/estilos/${carpeta}/${fotos[estilo]}.jpg`,
    }));
  const otros = catalogo.filter((estilo) => !Object.hasOwn(fotos, estilo));
  const seleccionar = (estilo: string) => setFieldValue('estilo', estilo);

  return (
    <>
      <OpcionesConFoto
        grupo="estilo"
        opciones={conFoto}
        seleccion={values.estilo}
        onSelect={seleccionar}
      />
      {otros.length > 0 && (
        <details className={styles.masEstilos} open={otros.includes(values.estilo) || undefined}>
          <summary>Más estilos{otros.includes(values.estilo) ? ` · ${values.estilo}` : ''}</summary>
          <div className={styles.textoOpciones}>
            {otros.map((estilo) => (
              <label key={estilo}>
                <input
                  type="radio"
                  name="estilo"
                  checked={values.estilo === estilo}
                  onChange={() => seleccionar(estilo)}
                />
                {estilo}
              </label>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
