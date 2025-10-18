/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 在生產環境中，API 請求直接發送到後端服務
    // 在開發環境中，重寫到 localhost:4000
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:4000/:path*' },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
