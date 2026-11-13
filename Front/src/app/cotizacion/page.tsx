import { MarcoCotizacion } from './components/MarcoCotizacion';
import { SolicitudPorUbicacion } from './components/SolicitudPorUbicacion';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cotizar con artistas cercanos | InkManager',
  description: 'Encontrá tu artista ideal y pedí presupuesto a tatuadores cerca de tu zona.',
  referrer: 'no-referrer',
};

export default function CotizacionPage() {
  return (
    <MarcoCotizacion destinatario="Artistas de tu zona">
      <SolicitudPorUbicacion />
    </MarcoCotizacion>
  );
}
