'use client';

import FastMarquee from 'react-fast-marquee';
import Image from 'next/image';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useReviews } from '@/hooks/useReviews';
import styles from './landing.module.css';

export function ReviewsSection() {
  const reducedMotion = useReducedMotion();
  const { reviews, error } = useReviews();

  let message = '';
  if (error) {
    message = 'No pudimos cargar las reseñas en este momento.';
  } else if (reviews === null) {
    message = 'Cargando reseñas…';
  } else if (reviews.length === 0) {
    message = 'Todavía no hay reseñas para mostrar.';
  }

  const cards = reviews?.map((review) => (
    <figure className={`card ${styles.reviewCard}`} key={review.id}>
      <div className="card-body p-4 d-flex flex-column">
        <figcaption className="d-flex align-items-center gap-3 mb-4">
          <Image
            src={review.fotoUrl}
            alt={`Retrato de ${review.nombre}`}
            width={56}
            height={56}
            className={`rounded-circle ${styles.reviewAvatar}`}
          />
          <span className="fw-medium">{review.nombre}</span>
        </figcaption>
        <blockquote className="mb-0">
          <p className="mb-0">“{review.resena}”</p>
        </blockquote>
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
          <p id="reviews-note" className="small text-body-secondary mb-0">
            Perfiles y reseñas de ejemplo.
          </p>
        </header>
      </div>

      {message ? (
        <p className={`container-fluid ${styles.container}`} role={error ? 'alert' : 'status'}>
          {message}
        </p>
      ) : (
        <>
          {/* Los lectores de pantalla reciben cada reseña una sola vez. */}
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
        </>
      )}
    </section>
  );
}
