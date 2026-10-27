import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArtistShell } from './_components/ArtistShell';

export const metadata: Metadata = {
  title: 'Mi espacio | InkManager',
  robots: { index: false, follow: false },
};

export default function ArtistLayout({ children }: { children: ReactNode }) {
  return <ArtistShell>{children}</ArtistShell>;
}
