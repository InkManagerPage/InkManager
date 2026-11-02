import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StudioShell } from './_components/StudioShell';
export const metadata: Metadata = {
  title: 'Mi estudio | InkManager',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
