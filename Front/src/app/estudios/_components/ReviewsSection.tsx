'use client';

import FastMarquee from 'react-fast-marquee';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './landing.module.css';

// Reseñas ficticias. Para cambiar el contenido, editá esta lista.
const reviews = [
  {
    name: 'Lucía Fernández',
    role: 'Tatuadora independiente',
    text: 'Dejé de buscar señas entre mensajes. Ahora veo los turnos confirmados en un solo lugar.',
  },
  {
    name: 'Martín Suárez',
    role: 'Responsable de estudio',
    text: 'Somos cuatro en el estudio. Con la agenda compartida, cada uno sabe qué tiene para el día.',
  },
  {
    name: 'Camila Vega',
    role: 'Tatuadora independiente',
    text: 'La idea y las referencias llegan juntas. Puedo preparar un presupuesto sin volver a pedir todo.',
  },
  {
    name: 'Nicolás Torres',
    role: 'Tatuador y dueño de estudio',
    text: 'Me sirve retomar una consulta y tener el historial a mano, aunque hayan pasado varias semanas.',
  },
];

export function ReviewsSection() {
  const reducedMotion = useReducedMotion();

  const cards = reviews.map((review) => (
    <figure className={`card ${styles.reviewCard}`} key={review.name}>
      <div className="card-body p-4 d-flex flex-column">
        <blockquote className="mb-4">
          <p className="mb-0">“{review.text}”</p>
        </blockquote>
        <figcaption className="mt-auto border-top pt-3">
          <span className="d-block fw-medium">{review.name}</span>
          <span className="small text-body-secondary">{review.role}</span>
        </figcaption>
      </div>
    </figure>
  ));

  return (
    <section
      id="resenas"
      className={`border-top ${styles.section}`}
      aria-labelledby="reviews-title"
      aria-describedby="reviews-note"
    >
      <div className={`container-fluid ${styles.container}`}>
        <header className="mb-5">
          <h2 id="reviews-title" className="mb-3">
            Escuchalo de quienes ya lo usan
          </h2>
        </header>
      </div>

      {/* Esta versión permite leer cada reseña una sola vez con un lector de pantalla. */}
      <div className={reducedMotion ? styles.reviewsStatic : 'visually-hidden'}>{cards}</div>

      {!reducedMotion && (
        <div aria-hidden="true">
          <FastMarquee
            direction="right"
            speed={28}
            autoFill
            pauseOnHover
            gradient={false}
            style={{ overflow: 'hidden' }}
          >
            {cards}
          </FastMarquee>
        </div>
      )}
    </section>
  );
}
