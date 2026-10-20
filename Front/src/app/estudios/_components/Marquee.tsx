'use client';

import FastMarquee from 'react-fast-marquee';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './landing.module.css';

const words = ['Tatuajes', 'Consultas', 'Presupuestos', 'Agenda', 'Artistas'];

export function Marquee() {
  const reducedMotion = useReducedMotion();
  const content = words.map((word) => (
    <span className={styles.marqueeWord} key={word}>
      {word}
    </span>
  ));

  return (
    <section
      className={styles.marquee}
      aria-label="Tatuajes, consultas, presupuestos, agenda y artistas"
    >
      <div aria-hidden="true">
        {/* Si la persona prefiere menos movimiento, mostramos las palabras quietas. */}
        {reducedMotion ? (
          <div className={styles.staticWords}>{content}</div>
        ) : (
          <FastMarquee
            direction="right"
            speed={45}
            autoFill
            pauseOnHover
            gradient={false}
            style={{ overflow: 'hidden' }}
          >
            {content}
          </FastMarquee>
        )}
      </div>
    </section>
  );
}
