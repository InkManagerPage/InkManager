import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**/image/upload/**' },

      // dominio provisional mientras subo las imagenes a cloudinary
      {
        protocol: 'https',
        hostname: '**',
      },

      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },
};

export default nextConfig;
