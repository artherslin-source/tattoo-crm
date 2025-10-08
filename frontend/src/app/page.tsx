"use client";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
      <div className="text-center px-6 max-w-2xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">
          Tattoo
          <span className="text-yellow-400"> CRM</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          歡迎來到專業刺青工作室管理系統
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.push('/home')}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            進入系統
          </button>
          <button
            onClick={() => router.push('/login')}
            className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
          >
            立即登入
          </button>
        </div>

        <div className="mt-12 text-gray-400">
          <p>© 2025 Tattoo CRM. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
