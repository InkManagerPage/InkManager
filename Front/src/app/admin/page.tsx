import type { Metadata } from 'next';
import { Administracion } from './Administracion';

export const metadata: Metadata = {
  title: 'Administración | InkManager',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Administracion />;
}
