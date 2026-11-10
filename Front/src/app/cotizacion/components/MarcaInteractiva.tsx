'use client';

import Image from 'next/image';
import { useRef, useState, type PointerEvent } from 'react';
import type { MarcaZona } from '@/types/cotizacion';
import { bordeMarca, maximoMarcas, rellenoMarca } from '@/lib/ubicacion-tatuaje';
import styles from './marca-interactiva.module.css';

type Punto = { x: number; y: number };

function limitar(valor: number, maximo = 1) {
  return Math.max(0, Math.min(maximo, valor));
}

function puntoDe(evento: PointerEvent<HTMLButtonElement>): Punto {
  const imagen = evento.currentTarget.getBoundingClientRect();
  return {
    x: limitar((evento.clientX - imagen.left) / imagen.width),
    y: limitar((evento.clientY - imagen.top) / imagen.height),
  };
}

function rectangulo(inicio: Punto, fin: Punto): MarcaZona {
  return {
    x: Math.min(inicio.x, fin.x),
    y: Math.min(inicio.y, fin.y),
    ancho: Math.abs(inicio.x - fin.x),
    alto: Math.abs(inicio.y - fin.y),
  };
}

function marcaCentrada(punto: Punto): MarcaZona {
  const lado = 0.16;
  return {
    x: limitar(punto.x - lado / 2, 1 - lado),
    y: limitar(punto.y - lado / 2, 1 - lado),
    ancho: lado,
    alto: lado,
  };
}

function Recorte({ marca }: { marca: MarcaZona }) {
  return (
    <span
      aria-hidden="true"
      className={styles.recorte}
      style={{
        left: `${marca.x * 100}%`,
        top: `${marca.y * 100}%`,
        width: `${marca.ancho * 100}%`,
        height: `${marca.alto * 100}%`,
        borderColor: bordeMarca,
        backgroundColor: rellenoMarca,
      }}
    />
  );
}

export function MarcaInteractiva({
  foto,
  zona,
  marcas,
  onChange,
}: {
  foto: { src: string; ancho: number; alto: number };
  zona: string;
  marcas: MarcaZona[];
  onChange: (marcas: MarcaZona[]) => void;
}) {
  const inicio = useRef<{ id: number; punto: Punto }>(null);
  const [borrador, setBorrador] = useState<MarcaZona | null>(null);
  const [cursor, setCursor] = useState<Punto>({ x: 0.5, y: 0.5 });
  const limite = marcas.length >= maximoMarcas;

  function cancelar() {
    inicio.current = null;
    setBorrador(null);
  }

  function agregar(marca: MarcaZona) {
    if (!limite) onChange([...marcas, marca]);
  }

  return (
    <section className={styles.editor} aria-labelledby="titulo-marcado">
      <h2 id="titulo-marcado" className={styles.titulo}>
        Marcá el área del tatuaje
      </h2>
      <p id="ayuda-marcado" className={styles.ayuda}>
        Arrastrá o tocá la foto para marcar hasta tres áreas. Con el teclado, usá las flechas y
        Enter.
      </p>
      <div
        className={styles.foto}
        style={{ width: `min(100%, ${Math.round((450 * foto.ancho) / foto.alto)}px)` }}
      >
        <Image
          src={foto.src}
          alt={`Foto de referencia de ${zona}`}
          width={foto.ancho}
          height={foto.alto}
          unoptimized
        />
        <button
          type="button"
          className={styles.superficie}
          aria-label="Marcar sobre la foto"
          aria-describedby="ayuda-marcado"
          aria-disabled={limite}
          onPointerDown={(evento) => {
            if (limite || evento.button !== 0 || inicio.current) return;
            inicio.current = { id: evento.pointerId, punto: puntoDe(evento) };
            evento.currentTarget.setPointerCapture(evento.pointerId);
          }}
          onPointerMove={(evento) => {
            if (inicio.current?.id === evento.pointerId)
              setBorrador(rectangulo(inicio.current.punto, puntoDe(evento)));
          }}
          onPointerUp={(evento) => {
            if (inicio.current?.id !== evento.pointerId) return;
            const fin = puntoDe(evento);
            const marca = rectangulo(inicio.current.punto, fin);
            agregar(marca.ancho >= 0.025 && marca.alto >= 0.025 ? marca : marcaCentrada(fin));
            cancelar();
          }}
          onPointerCancel={cancelar}
          onLostPointerCapture={cancelar}
          onClick={(evento) => {
            if (evento.detail === 0) agregar(marcaCentrada(cursor));
          }}
          onKeyDown={(evento) => {
            const pasos: Record<string, [number, number]> = {
              ArrowLeft: [-0.04, 0],
              ArrowRight: [0.04, 0],
              ArrowUp: [0, -0.04],
              ArrowDown: [0, 0.04],
            };
            const paso = pasos[evento.key];
            if (!paso || limite) return;
            evento.preventDefault();
            setCursor((p) => ({ x: limitar(p.x + paso[0]), y: limitar(p.y + paso[1]) }));
          }}
        >
          {marcas.map((marca, i) => (
            <Recorte key={i} marca={marca} />
          ))}
          {borrador && <Recorte marca={borrador} />}
          {!limite && (
            <span
              aria-hidden="true"
              className={styles.cursor}
              style={{
                left: `${cursor.x * 100}%`,
                top: `${cursor.y * 100}%`,
              }}
            />
          )}
        </button>
      </div>
      <div className={styles.acciones}>
        <small role="status">
          {marcas.length} de {maximoMarcas} marcas
        </small>
        {marcas.map((_, i) => (
          <button
            className="btn btn-link btn-sm"
            type="button"
            key={i}
            onClick={() => {
              onChange(marcas.filter((_, indice) => indice !== i));
            }}
          >
            Quitar marca {i + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
