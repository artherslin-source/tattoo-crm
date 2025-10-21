"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IntroAnimation from "@/components/IntroAnimation/IntroAnimation";
import LogoEnergy from "@/components/LogoEnergy/LogoEnergy";

export default function WelcomePage() {
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      {/* Intro Animation */}
      {!introDone && <IntroAnimation onFinish={() => setIntroDone(true)} />}
      
      {/* Main Content */}
      {introDone && (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center animate-fade-in">
          <div className="text-center px-6 max-w-2xl mx-auto">
            {/* Logo with persistent energy glow */}
            <div className="mb-6 flex justify-center">
              <LogoEnergy />
            </div>
            
            <p className="text-xl md:text-2xl text-text-muted-light mb-8">
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

            <div className="mt-12 text-text-muted-light">
              <p>© 2025 Tattoo CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
