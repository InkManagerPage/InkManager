import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backend =
      process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';
    return [{ source: '/api/:path*', destination: `${backend.replace(/\/+$/, '')}/:path*` }];
  },
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
      },
    ],
  },
};

export default nextConfig;
