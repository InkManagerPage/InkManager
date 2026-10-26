import { PortfolioImage } from '@/types/estudios';
import PortfolioCard from './PortfolioCard';
import styles from './portfolio.module.css';

interface PortfolioListProps {
  portfolio: PortfolioImage[];
}

const PortfolioList = ({ portfolio }: PortfolioListProps) => {
  if (!portfolio) {
    return (
      <div>
        <span>No hay imágenes disponibles</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.grid}>
        {portfolio.map((imagen) => (
          <PortfolioCard key={imagen.id} image={imagen} />
        ))}
      </div>
    </div>
  );
};

export default PortfolioList;