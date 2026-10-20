import type { Metadata } from 'next';
import { LandingHeader } from './_components/LandingHeader';
import { Hero } from './_components/Hero';
import { PlatformSection } from './_components/PlatformSection';
import { ToolsSection } from './_components/ToolsSection';
import { ReviewsSection } from './_components/ReviewsSection';
import { Marquee } from './_components/Marquee';
import { PlansSection } from './_components/PlansSection';
import { LandingFooter } from './_components/LandingFooter';
import styles from './_components/landing.module.css';

export const metadata: Metadata = {
  title: 'InkManager | Más tiempo para tatuar',
  description:
    'Consultas, presupuestos y turnos en un mismo lugar. Una plataforma pensada para tatuadores independientes y estudios.',
};

export default function StudioLandingPage() {
  return (
    <div className={styles.landing} data-bs-theme="light">
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>
      <LandingHeader />
      <main id="contenido">
        <Hero />
        <Marquee />
        <PlatformSection />
        <ToolsSection />
        <ReviewsSection />
        <PlansSection />
      </main>
      <LandingFooter />
    </div>
  );
}
