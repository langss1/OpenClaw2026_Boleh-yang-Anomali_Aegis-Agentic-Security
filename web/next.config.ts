import type { NextConfig } from 'next';

/** Express SaaS API (server/). Next.js dev biasanya di :3000. */
const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/landing', destination: '/', permanent: true },
      { source: '/get-started', destination: '/login', permanent: false },
      { source: '/dashboard', destination: '/pricing', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
