import { Studio } from '@/types/estudios';

export const MOCK_STUDIOS: Studio[] = [
  {
    id: 'st-101',
    name: 'Sacred Skin Studio',
    slug: 'sacred-skin-studio',
    description:
      'Estudio especializado en neotradicional, blackwork y realismo en el norte de Bogotá.',
    address: 'Carrera 15 #85-12, Zona Rosa',
    city: 'Bogotá',
    country: 'Colombia',
    phone: '+57 310 555 0192',
    email: 'contacto@sacredskin.co',
    instagram_handle: 'sacredskin_bog',
    logo_url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'st-102',
    name: 'Aethelgard Tattoo Collective',
    slug: 'aethelgard-tattoo',
    description:
      'Colectivo enfocado en mitología, microrealismo, grabado y geometrías en Quinta Camacho.',
    address: 'Calle 69 #10-34, Quinta Camacho',
    city: 'Bogotá',
    country: 'Colombia',
    phone: '+57 300 444 8811',
    email: 'info@aethelgard.com',
    instagram_handle: 'aethelgard_tattoo',
    logo_url: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=400',
    created_at: '2026-02-01T12:30:00Z',
  },
];
