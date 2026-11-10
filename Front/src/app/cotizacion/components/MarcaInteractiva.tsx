'use client';

import Image from 'next/image';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { MarcaZona } from '@/types/cotizacion';
import { fotoFormulario } from '@/lib/fotos-formulario';
import { bordeMarca, maximoMarcas, rellenoMarca } from '@/lib/ubicacion-tatuaje';
import {
  dibujarMarca,
  editarMarca,
  girarMarca,
  limitar,
  marcaCentrada,
  type Edicion,
  type Punto,
} from './geometria-marca';
import styles from './marca-interactiva.module.css';

type Gesto = { id: number; inicio: Punto } & (
  { accion: 'dibujar' } | { accion: Edicion; indice: number; original: MarcaZona }
);

const pasos: Record<string, Punto> = {
  ArrowLeft: { x: -0.025, y: 0 },
  ArrowRight: { x: 0.025, y: 0 },
  ArrowUp: { x: 0, y: -0.025 },
  ArrowDown: { x: 0, y: 0.025 },
};

function limitarPunto(punto: Punto) {
  return { x: limitar(punto.x), y: limitar(punto.y) };
}

export function MarcaInteractiva({
  foto,
  zona,
  marcas,
  onChange,
}: {
  foto: { referencia: string; ancho: number; alto: number };
  zona: string;
  marcas: MarcaZona[];
  onChange: (marcas: MarcaZona[]) => void;
}) {
  const lienzo = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<{ indice: number; marca: MarcaZona } | null>(null);
  const [cursor, setCursor] = useState<Punto>({ x: 0.5, y: 0.5 });
  const limite = marcas.length >= maximoMarcas;

  function medirLienzo() {
    const { left, top, width, height } = lienzo.current!.getBoundingClientRect();
    return { izquierda: left, arriba: top, ancho: width, alto: height };
  }

  function puntoDe(evento: PointerEvent, medidas = medirLienzo()): Punto {
    return {
      x: (evento.clientX - medidas.izquierda) / medidas.ancho,
      y: (evento.clientY - medidas.arriba) / medidas.alto,
    };
  }

  function iniciar(
    evento: PointerEvent<HTMLButtonElement>,
    accion: 'dibujar' | Edicion,
    indice = -1,
  ) {
    if (!lienzo.current || gesto.current || evento.button !== 0 || (accion === 'dibujar' && limite))
      return;
    const inicio = puntoDe(evento);
    gesto.current =
      accion === 'dibujar'
        ? { accion, id: evento.pointerId, inicio: limitarPunto(inicio) }
        : { accion, id: evento.pointerId, inicio, indice, original: marcas[indice]! };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function cancelar(id: number) {
    if (gesto.current?.id !== id) return;
    gesto.current = null;
    setVistaPrevia(null);
  }

  function actualizar(indice: number, marca: MarcaZona) {
    onChange(marcas.map((anterior, i) => (i === indice ? marca : anterior)));
  }

  function agregar(marca: MarcaZona) {
    if (!limite) onChange([...marcas, marca]);
  }

  function editarConTeclado(evento: KeyboardEvent, accion: Edicion, indice: number) {
    const paso = pasos[evento.key];
    if (!paso) return;
    evento.preventDefault();
    const marca = marcas[indice]!;
    actualizar(indice, editarMarca(marca, accion, { x: 0, y: 0 }, paso, medirLienzo()));
  }

  return (
    <section aria-label="Editor de ubicación del tatuaje">
      <p id="ayuda-marcado" className={styles.ayuda}>
        Arrastrá o tocá la foto para marcar hasta tres áreas. Podés moverlas y ajustar sus esquinas.
      </p>
      <div
        ref={lienzo}
        className={styles.foto}
        style={{
          width: `min(100%, calc(clamp(29rem, 62svh, 35rem) * ${foto.ancho / foto.alto}))`,
        }}
        onPointerMove={(evento) => {
          const activo = gesto.current;
          if (!activo || activo.id !== evento.pointerId) return;
          const medidas = medirLienzo();
          const fin = puntoDe(evento, medidas);
          if (activo.accion === 'dibujar') {
            setVistaPrevia({
              indice: -1,
              marca: dibujarMarca(activo.inicio, limitarPunto(fin), medidas),
            });
          } else {
            setVistaPrevia({
              indice: activo.indice,
              marca: editarMarca(activo.original, activo.accion, activo.inicio, fin, medidas),
            });
          }
        }}
        onPointerUp={(evento) => {
          const activo = gesto.current;
          if (!activo || activo.id !== evento.pointerId) return;
          const medidas = medirLienzo();
          const fin = puntoDe(evento, medidas);
          if (activo.accion === 'dibujar') {
            agregar(dibujarMarca(activo.inicio, limitarPunto(fin), medidas));
          } else {
            const toque = Math.hypot(fin.x - activo.inicio.x, fin.y - activo.inicio.y) < 0.01;
            actualizar(
              activo.indice,
              activo.accion === 'rotar' && toque
                ? girarMarca(activo.original, 15, medidas)
                : editarMarca(activo.original, activo.accion, activo.inicio, fin, medidas),
            );
          }
          cancelar(evento.pointerId);
        }}
        onPointerCancel={(evento) => cancelar(evento.pointerId)}
        onLostPointerCapture={(evento) => cancelar(evento.pointerId)}
      >
        <Image
          src={fotoFormulario(foto.referencia, foto.ancho)}
          alt={`Foto de referencia de ${zona}`}
          width={foto.ancho}
          height={foto.alto}
          crossOrigin="anonymous"
          unoptimized
        />
        <button
          type="button"
          className={styles.superficie}
          aria-label="Marcar sobre la foto"
          aria-describedby="ayuda-marcado"
          aria-disabled={limite}
          onPointerDown={(evento) => iniciar(evento, 'dibujar')}
          onClick={(evento) => {
            if (evento.detail === 0) agregar(marcaCentrada(cursor, medirLienzo()));
          }}
          onKeyDown={(evento) => {
            const paso = pasos[evento.key];
            if (!paso || limite) return;
            evento.preventDefault();
            setCursor((p) => limitarPunto({ x: p.x + paso.x, y: p.y + paso.y }));
          }}
        >
          {!limite && (
            <span
              aria-hidden="true"
              className={styles.cursor}
              style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
            />
          )}
        </button>

        {marcas.map((anterior, i) => {
          const marca = vistaPrevia?.indice === i ? vistaPrevia.marca : anterior;
          return (
            <div key={i} className={styles.recorte} style={estiloMarca(marca)}>
              <button
                type="button"
                className={styles.mover}
                aria-label={`Mover marca ${i + 1}`}
                onPointerDown={(evento) => iniciar(evento, 'mover', i)}
                onKeyDown={(evento) => editarConTeclado(evento, 'mover', i)}
              />
              <button
                type="button"
                className={`${styles.control} ${styles.rotar}`}
                aria-label={`Rotar marca ${i + 1}`}
                onPointerDown={(evento) => iniciar(evento, 'rotar', i)}
                onClick={(evento) => {
                  if (evento.detail === 0) actualizar(i, girarMarca(anterior, 15, foto));
                }}
              >
                ↻
              </button>
              <button
                type="button"
                className={`${styles.control} ${styles.eliminar}`}
                aria-label={`Eliminar marca ${i + 1}`}
                onClick={() => onChange(marcas.filter((_, indice) => indice !== i))}
              >
                ×
              </button>
              <button
                type="button"
                className={`${styles.control} ${styles.redimensionar}`}
                aria-label={`Cambiar tamaño de la marca ${i + 1}`}
                onPointerDown={(evento) => iniciar(evento, 'redimensionar', i)}
                onKeyDown={(evento) => editarConTeclado(evento, 'redimensionar', i)}
              >
                ↘
              </button>
            </div>
          );
        })}
        {vistaPrevia?.indice === -1 && (
          <span
            aria-hidden="true"
            className={styles.borrador}
            style={estiloMarca(vistaPrevia.marca)}
          />
        )}
      </div>
      <small className={styles.total} role="status">
        {marcas.length} de {maximoMarcas} marcas
      </small>
    </section>
  );
}

function estiloMarca(marca: MarcaZona) {
  return {
    left: `${marca.x * 100}%`,
    top: `${marca.y * 100}%`,
    width: `${marca.ancho * 100}%`,
    height: `${marca.alto * 100}%`,
    transform: `rotate(${marca.rotacion}deg)`,
    borderColor: bordeMarca,
    backgroundColor: rellenoMarca,
  };
}
