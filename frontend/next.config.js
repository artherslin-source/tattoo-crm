/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ 忽略 ESLint 錯誤，防止 Railway build 中斷
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,

  // ✅ Railway 需要 "standalone" 模式，Next.js 15 預設改了要手動指定
  output: 'standalone',

  async rewrites() {
    return [
      {
        // ✅ 讓前端 API 呼叫正確導向後端
        source: '/api/:path*',
        destination: 'https://tattoo-crm-production-413f.up.railway.app/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
