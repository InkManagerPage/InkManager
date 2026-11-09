import Image from 'next/image';
import type { TrabajoPublico } from '@/types/artista';
import styles from './portfolio.module.css';

export interface PortfolioCardProps {
  trabajo: TrabajoPublico;
  onOpen: () => void;
  loading: 'eager' | 'lazy';
}

export default function PortfolioCard({ trabajo, onOpen, loading }: PortfolioCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageFrame}>
        <Image
          src={trabajo.url}
          alt={trabajo.descripcion}
          fill
          loading={loading}
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
          className={styles.image}
        />
        <div className={styles.overlay}>
          <div className={styles.cardDetails}>
            <p className={styles.style}>{trabajo.estilos.join(' · ')}</p>
            <h2 className={styles.artistName}>{trabajo.nombreArtista}</h2>
            <button
              type="button"
              className={styles.cardAction}
              onClick={onOpen}
              aria-label={`Ver detalles del trabajo de ${trabajo.nombreArtista}: ${trabajo.descripcion}`}
            >
              Ver detalles
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
