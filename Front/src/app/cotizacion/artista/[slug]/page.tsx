import Link from 'next/link';
import { SolicitudPublica } from '../../components/SolicitudPublica';
import styles from '@/components/auth/auth.module.css';

export default async function CotizacionArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className={styles.accountPage}>
      <div className={styles.accountCard}>
        <Link href="/clientes" className={styles.eyebrow}>
          ← Volver al catálogo
        </Link>
        <h1 className="mt-3">Solicitar presupuesto</h1>
        <SolicitudPublica key={slug} destino={{ artista: slug }} />
      </div>
    </main>
  );
}
