import Link from 'next/link';
import styles from '@/components/auth/auth.module.css';

interface BotonCotizacionProps {
  artistaId?: string | number;
  className?: string;
  texto?: string;
}

export function BotonCotizacion({
  artistaId,
  className,
  texto = 'Solicitar Cotización',
}: BotonCotizacionProps) {
  const url = artistaId ? `/cotizacion?artista=${artistaId}` : '/cotizacion';

  return (
    <Link
      href={url}
      className={className || styles.submit}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        textAlign: 'center',
      }}
    >
      {texto}
    </Link>
  );
}