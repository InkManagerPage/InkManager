import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import localFont from 'next/font/local';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { AuthProvider } from '@/store/AuthProvider';
import { GoogleAuthNotice } from '@/components/auth/GoogleAuthNotice';

const plex = localFont({
  src: [
    { path: '../../public/fonts/ibm-plex-sans-regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/ibm-plex-sans-medium.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InkManager',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={plex.variable}>
      <body>
        <AuthProvider>
          {children}
          <Suspense fallback={null}>
            <GoogleAuthNotice />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
