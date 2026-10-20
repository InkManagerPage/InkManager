import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <Link href="/">Volver al inicio</Link>
    </main>
  );
}
