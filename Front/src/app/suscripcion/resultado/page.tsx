import type { Metadata } from 'next';
import { ResultadoSuscripcion } from '../_components/ResultadoSuscripcion';

export const metadata: Metadata = {
  title: 'Estado de suscripción | InkManager',
};

export default function ResultadoSuscripcionPage() {
  return <ResultadoSuscripcion />;
}
