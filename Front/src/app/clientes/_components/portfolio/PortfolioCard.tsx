import Image from 'next/image';
import type { TrabajoPublico } from '@/types/artista';
import styles from './portfolio.module.css';

export default function PortfolioCard({
  trabajo,
  onOpen,
  loading,
}: {
  trabajo: TrabajoPublico;
  onOpen: () => void;
  loading: 'eager' | 'lazy';
}) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onOpen}
      aria-label={`Ver trabajo de ${trabajo.nombreArtista}: ${trabajo.descripcion}`}
    >
      <div className={styles.imageFrame}>
        <Image
          src={trabajo.url}
          alt={trabajo.descripcion}
          fill
          loading={loading}
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
          className={styles.image}
        />
      </div>
      <div className={styles.cardInfo}>
        <span>{trabajo.nombreArtista}</span>
        <small>{trabajo.estilos.join(' · ')}</small>
      </div>
    </button>
  );
}
