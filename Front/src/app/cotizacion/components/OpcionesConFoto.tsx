import Image from 'next/image';
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
  const columnas = opciones.length <= 2 ? '48vw' : '32vw';
  const anchoMovil = grupo === 'color' ? '94vw' : '46vw';

  return (
    <div
      className={styles.opciones}
      data-grupo={grupo}
      data-cantidad={opciones.length <= 2 ? 'dos' : undefined}
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
              sizes={`(max-width: 540px) ${anchoMovil}, ${columnas}`}
              unoptimized
            />
          </span>
          <span className={styles.etiqueta}>{etiqueta || valor}</span>
        </label>
      ))}
    </div>
  );
}
