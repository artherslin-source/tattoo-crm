/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tattoo-crm-production-413f.up.railway.app',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'tattoo-crm-production.up.railway.app',
        port: '',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // 在開發環境中，重寫到 localhost:4000
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:4000/:path*' },
        { source: '/uploads/:path*', destination: 'http://localhost:4000/uploads/:path*' },
      ];
    }
    
    // 生產環境：重寫到 Railway 後端服務
    console.log('Using production rewrite rules');
    const backendUrl = 'https://tattoo-crm-production-413f.up.railway.app';
    return [
      { source: '/api/:path*', destination: `${backendUrl}/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
