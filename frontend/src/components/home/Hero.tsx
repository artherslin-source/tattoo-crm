import Image from "next/image";
import { Button } from "@/components/ui/button";

interface HeroProps {
  loggedIn: boolean;
  config?: {
    imageUrl: string;
    imageAlt: string;
    badgeText: string;
    headlineLines: string[];
    description: string;
    primaryCtaText: string;
    stats: Array<{ value: string; label: string }>;
  };
}

export function Hero({ loggedIn, config }: HeroProps) {
  const c = config ?? {
    imageUrl: "/images/banner/tattoo-monk.jpg",
    imageAlt: "專業紋身師正在進行精細的紋身工作，展現東方禪意與現代工藝的完美結合",
    badgeText: "Premium Tattoo Studio",
    headlineLines: ["為熱愛刺青的你", "打造專屬體驗"],
    description:
      "透過 Tattoo CRM 預約、管理與追蹤每一次刺青旅程，讓靈感與工藝在同一個地方匯聚。",
    primaryCtaText: "立即預約",
    stats: [
      { value: "1200+", label: "完成作品" },
      { value: "15", label: "駐店藝術家" },
      { value: "98%", label: "客戶滿意度" },
      { value: "24/7", label: "線上諮詢" },
    ],
  };

  const isRemote = /^https?:\/\//i.test(c.imageUrl);

  return (
    <section className="relative isolate overflow-hidden bg-[#1a1a1a]">
      <div className="absolute inset-0">
        {isRemote ? (
          <img
            src={c.imageUrl}
            alt={c.imageAlt}
            className="h-full w-full object-cover brightness-105"
          />
        ) : (
          <Image
            src={c.imageUrl}
            alt={c.imageAlt}
            fill
            priority
            className="object-cover brightness-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center gap-12 px-4 py-24 sm:px-6 ipad:py-20 ipad:min-h-[62vh] lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        <div className="max-w-2xl space-y-6 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            {c.badgeText}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl ipad:text-5xl ipad:leading-tight lg:text-6xl">
            {c.headlineLines[0] || ""}
            <br className="hidden sm:block" />
            {c.headlineLines[1] || ""}
          </h1>
          <p className="text-base text-neutral-200 sm:text-lg ipad:text-lg">
            {c.description}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="default"
              className="w-full bg-yellow-400 text-black hover:bg-yellow-300 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
              onClick={() =>
                document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {c.primaryCtaText}
            </Button>
            {!loggedIn && (
              <Button
                variant="outline"
                size="default"
                className="w-full border-white/30 text-text-muted-light hover:bg-white/10 hover:text-white sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                onClick={() => (window.location.href = '/login')}
              >
                會員登入
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left text-white/80 sm:max-w-lg ipad:gap-5 lg:max-w-none">
          {c.stats.slice(0, 4).map((s, idx) => (
            <div
              key={`${idx}-${s.label}`}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur ipad:p-6"
            >
              <p className="text-3xl font-semibold text-white ipad:text-4xl">{s.value}</p>
              <p className="text-sm uppercase tracking-[0.3em] text-white/50 ipad:text-[0.95rem]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
