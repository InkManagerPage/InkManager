import Image from 'next/image';
import { fotoFormulario } from '@/lib/fotos-formulario';
import styles from './cotizacion.module.css';

type Opcion = { valor: string; etiqueta?: string; foto: string };

export function OpcionesConFoto({
  grupo,
  opciones,
  seleccion,
  onSelect,
  cuerpo = false,
}: {
  grupo: string;
  opciones: Opcion[];
  seleccion: string;
  onSelect: (valor: string) => void;
  cuerpo?: boolean;
}) {
  const dosColumnas = opciones.length <= 2;
  const sizes =
    grupo === 'estilo'
      ? '(max-width: 540px) 46vw, (max-width: 760px) 31vw, (max-width: 900px) 23vw, (max-width: 1160px) 18vw, 180px'
      : `(max-width: 540px) 46vw, (max-width: 760px) ${dosColumnas ? '48vw' : '31vw'}, ${dosColumnas ? '36vw' : '24vw'}`;

  return (
    <div
      className={styles.opciones}
      data-grupo={grupo}
      data-cantidad={dosColumnas ? 'dos' : undefined}
    >
      {opciones.map(({ valor, etiqueta, foto }) => (
        <label key={valor} className={styles.opcion}>
          <input
            type="radio"
            name={grupo}
            value={valor}
            checked={seleccion === valor}
            onChange={() => onSelect(valor)}
          />
          <span className={styles.muestra} data-cuerpo={cuerpo || undefined}>
            <Image
              src={foto}
              alt=""
              fill
              sizes={sizes}
              loader={({ src, width }) => fotoFormulario(src, width)}
              loading={grupo === 'color' ? 'eager' : undefined}
            />
          </span>
          <span className={styles.etiqueta}>{etiqueta || valor}</span>
        </label>
      ))}
    </div>
  );
}
