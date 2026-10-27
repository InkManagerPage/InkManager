import { Artist } from '@/types/estudios';
import ArtistCard from './ArtistCard';
import styles from './artist.module.css';

interface ArtistListProps {
  artist: Artist[];
}

const ArtistList = ({ artist }: ArtistListProps) => {
  if (!artist) {
    return (
      <div>
        <span>No hay artistas disponibles</span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.grid}>
        {artist.map((artista) => (
          <ArtistCard key={artista.id} artist={artista} />
        ))}
      </div>
    </div>
  );
};

export default ArtistList;
