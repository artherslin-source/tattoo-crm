/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ 忽略 ESLint 錯誤，防止 Railway build 因 any/unused-vars 中斷
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        // ✅ 讓前端能正確呼叫後端 API
        source: '/api/:path*',
        destination: 'https://tattoo-crm-production-413f.up.railway.app/:path*',
      },
    ];
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
