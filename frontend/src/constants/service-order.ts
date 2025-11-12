export const SERVICE_DISPLAY_ORDER = [
  "半胛圖",
  "排胛圖",
  "大腿表面",
  "大腿全包",
  "小腿表面",
  "小腿全包",
  "前手臂",
  "上手臂",
  "大小腿包全肢",
  "上下手臂全肢",
  "單胸到包全手",
  "大背後圖",
  "背後左或右圖",
  "大背到大腿圖",
  "雙胸到腹肚圖",
  "雙前胸口圖",
  "單胸口圖",
  "腹肚圖",
  "單胸腹肚圖",
  "圖騰小圖案",
] as const;

export type ServiceDisplayName = (typeof SERVICE_DISPLAY_ORDER)[number];

export const SERVICE_ORDER_SET: ReadonlySet<string> = new Set(
  SERVICE_DISPLAY_ORDER
);

export const SERVICE_ORDER_MAP: Record<string, number> = SERVICE_DISPLAY_ORDER.reduce(
  (acc, name, index) => {
    acc[name] = index;
    return acc;
  },
  {} as Record<string, number>
);

export const SERVICE_FALLBACK_ITEMS: Array<{
  id: string;
  title: ServiceDisplayName;
  thumb: string;
  description?: string;
}> = SERVICE_DISPLAY_ORDER.map((name, index) => ({
  id: `fallback-${index}`,
  title: name,
  thumb: `https://placehold.co/640x400?text=${encodeURIComponent(name)}`,
}));

