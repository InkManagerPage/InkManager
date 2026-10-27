import { Studio } from '@/types/estudios';
import StudioCard from './StudioCard';
import styles from './studio.module.css';

interface StudiosListProps {
  studios: Studio[];
}

const StudiosList = ({ studios }: StudiosListProps) => {
  if (!studios) {
    return (
      <div>
        <span>No hay estudios disponibles</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.grid}>
        {studios.map((studio) => (
          <StudioCard key={studio.name} estudio={studio} />
        ))}
      </div>
    </div>
  );
};

export default StudiosList;
