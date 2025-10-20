/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 在生產環境中，API 請求直接發送到後端服務
    // 在開發環境中，重寫到 localhost:4000
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:4000/:path*' },
        { source: '/uploads/:path*', destination: 'http://localhost:4000/uploads/:path*' },
      ];
    }
    
    // 生產環境：重寫到 Railway 後端服務
    return [
      { source: '/api/:path*', destination: 'https://tattoo-crm-production-413f.up.railway.app/:path*' },
      { source: '/uploads/:path*', destination: 'https://tattoo-crm-production-413f.up.railway.app/uploads/:path*' },
    ];
  },
};

module.exports = nextConfig;
