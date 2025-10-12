import Image from "next/image";
import { Button } from "@/components/ui/button";

interface HeroProps {
  loggedIn: boolean;
}

export function Hero({ loggedIn }: HeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-[#080808]">
      <div className="absolute inset-0">
        <Image
          src="/images/hero/tattoo-artist.svg"
          alt="刺青師正在為客戶服務"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center gap-12 px-4 py-24 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        <div className="max-w-2xl space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            Premium Tattoo Studio
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            為熱愛刺青的你
            <br className="hidden sm:block" />
            打造專屬體驗
          </h1>
          <p className="text-base text-neutral-200 sm:text-lg">
            透過 Tattoo CRM 預約、管理與追蹤每一次刺青旅程，讓靈感與工藝在同一個地方匯聚。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button size="lg" className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}>
              立即預約
            </Button>
            {!loggedIn && (
              <Button variant="outline" size="lg" className="border-white/30 text-gray-600 hover:bg-white/10" onClick={() => window.location.href = '/login'}>
                會員登入
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left text-white/80 sm:max-w-lg lg:max-w-none">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-3xl font-semibold text-white">1200+</p>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">完成作品</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-3xl font-semibold text-white">15</p>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">駐店藝術家</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-3xl font-semibold text-white">98%</p>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">客戶滿意度</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-3xl font-semibold text-white">24/7</p>
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">線上諮詢</p>
          </div>
        </div>
      </div>
    </section>
  );
}
