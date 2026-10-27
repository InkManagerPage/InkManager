import { Studio } from '@/types/estudios';
import Image from 'next/image';
import styles from './studio.module.css';

interface StudioCardProps {
  estudio: Studio;
}

const StudioCard = ({ estudio }: StudioCardProps) => {
  return (
    <div className={styles.card}>
      {/* Contenedor de la Imagen */}
      <div className={styles.imageFrame}>
        <Image src={estudio.logo_url} alt={estudio.slug} fill className={styles.image} />

        {/* Sombra inferior en la imagen para garantizar legibilidad del título */}
        <div className={styles.gradient} />

        {/* Título sobre la imagen (siempre legible) */}
        <div className={styles.studioName}>
          <h3>{estudio.name}</h3>
        </div>

        {/* Overlay con la descripción al hacer Hover */}
        <div className={styles.descriptionOverlay}>
          <p>{estudio.description}</p>
        </div>
      </div>

      {/* Pie de tarjeta (Ciudad / Detalles) */}
      <div className={styles.location}>
        <svg className={styles.locationIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <span>{estudio.city}</span>
      </div>
    </div>
  );
};

export default StudioCard;
