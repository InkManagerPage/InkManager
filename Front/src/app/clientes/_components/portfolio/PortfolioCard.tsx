import { PortfolioImage } from '@/types/estudios';
import Image from 'next/image';
import styles from './portfolio.module.css';

interface PortfolioCardProps {
  image: PortfolioImage;
}

const PortfolioCard = ({ image }: PortfolioCardProps) => {
  return (
    <article className={styles.card}>
      <div className={styles.imageFrame}>
        <Image
          src={image.image_url}
          alt={image.caption}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          className={styles.image}
        />
      </div>
      <div className={styles.details}>
        <p className={styles.caption}>{image.caption}</p>
        <span className={styles.styleTag}>Estilo: {image.style}</span>
      </div>
    </article>
  );
};

export default PortfolioCard;
