export type HomeHeroConfig = {
  imageUrl: string;
  imageAlt: string;
  badgeText: string;
  headlineLines: string[];
  description: string;
  primaryCtaText: string;
  stats: Array<{ value: string; label: string }>; // length = 4
};

export const HOME_HERO_KEY = 'home.hero';

export const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  imageUrl: '/images/banner/tattoo-monk.jpg',
  imageAlt: '專業紋身師正在進行精細的紋身工作，展現東方禪意與現代工藝的完美結合',
  badgeText: 'Premium Tattoo Studio',
  headlineLines: ['為熱愛刺青的你', '打造專屬體驗'],
  description: '透過 Tattoo CRM 預約、管理與追蹤每一次刺青旅程，讓靈感與工藝在同一個地方匯聚。',
  primaryCtaText: '立即預約',
  stats: [
    { value: '1200+', label: '完成作品' },
    { value: '15', label: '駐店藝術家' },
    { value: '98%', label: '客戶滿意度' },
    { value: '24/7', label: '線上諮詢' },
  ],
};


