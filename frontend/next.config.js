/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 只在開發環境啟用 API rewrites
    // staging/production 禁用 rewrites，所有請求直接走 NEXT_PUBLIC_API_BASE_URL
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' },
        { source: '/uploads/:path*', destination: 'http://localhost:4000/uploads/:path*' },
      ];
    }
    
    // staging/production: 不使用 rewrites
    return [];
  },
};

module.exports = nextConfig;
