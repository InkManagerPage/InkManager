import { Artist } from '@/types/estudios';
import Image from 'next/image';
import styles from './artist.module.css';

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const stylesList = artist.styles;

  return (
    <div className={styles.card}>
      {/* Contenedor de la Imagen / Avatar */}
      <div className={styles.imageFrame}>
        <Image
          src={artist.avatar_url}
          alt={artist.slug || artist.stage_name}
          fill
          className={styles.image}
        />

        {/* Degradado inferior para legibilidad del nombre */}
        <div className={styles.gradient} />

        {/* Nombre del Artista */}
        <div className={styles.artistName}>
          <h3>{artist.stage_name}</h3>
        </div>

        {/* Overlay con la Bio al hacer Hover */}
        <div className={styles.bioOverlay}>
          <p>{artist.bio}</p>
        </div>
      </div>

      {/* Información Inferior */}
      <div className={styles.details}>
        {/* Chips / Badges para los Estilos */}
        {stylesList.length > 0 && (
          <div className={styles.stylesList}>
            {stylesList.map((style, index) => (
              <span key={index} className={styles.styleTag}>
                {style}
              </span>
            ))}
          </div>
        )}

        {/* Ubicación / Ciudad */}
        <div className={styles.location}>
          <svg
            className={styles.locationIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{artist.city}</span>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
