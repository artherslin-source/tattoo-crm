export type BillingAddon = {
  key: string;
  label: string;
  amount: number;
};

export type BillingItemBreakdown = {
  serviceName: string;
  color: string | null;
  finalPrice: number;
  servicePrice: number;
  addons: BillingAddon[];
  addonsTotal: number;
  designFee: number;
  customAddon: number;
};

const KNOWN_ADDON_LABELS: Record<string, string> = {
  design_fee: "設計費",
  custom_addon: "加購",
};

const NON_MONEY_KEYS = new Set([
  "side",
  "color",
  "size",
  "position",
  "style",
  "complexity",
  "technique",
]);

function toMoney(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    if (!/^-?\\d+(\\.\\d+)?$/.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

function normalizeColor(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : null;
  }
  return null;
}

function stripColorSuffix(name: string, color: string | null): string {
  if (!color) return name;
  const suffix = `-${color}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

export function buildBillItemBreakdown(input: {
  nameSnapshot?: string | null;
  finalPriceSnapshot?: number | null;
  variantsSnapshot?: unknown;
}): BillingItemBreakdown {
  const rawName = input.nameSnapshot || "服務";
  const finalPrice = typeof input.finalPriceSnapshot === "number" && Number.isFinite(input.finalPriceSnapshot) ? Math.round(input.finalPriceSnapshot) : 0;

  const variants = input.variantsSnapshot && typeof input.variantsSnapshot === "object" ? (input.variantsSnapshot as Record<string, unknown>) : {};
  const color = normalizeColor(variants.color);
  const serviceName = stripColorSuffix(rawName, color);

  const addons: BillingAddon[] = [];
  const designFee = toMoney(variants.design_fee) ?? 0;
  const customAddon = toMoney(variants.custom_addon) ?? 0;

  if (customAddon > 0) addons.push({ key: "custom_addon", label: KNOWN_ADDON_LABELS.custom_addon, amount: customAddon });
  if (designFee > 0) addons.push({ key: "design_fee", label: KNOWN_ADDON_LABELS.design_fee, amount: designFee });

  for (const [key, raw] of Object.entries(variants)) {
    if (NON_MONEY_KEYS.has(key)) continue;
    if (key === "design_fee" || key === "custom_addon") continue;
    const amt = toMoney(raw);
    if (amt === null) continue;
    if (amt <= 0) continue;
    const label = KNOWN_ADDON_LABELS[key] || `其他附加（${key}）`;
    addons.push({ key, label, amount: amt });
  }

  // Stable ordering: known first, then others
  const sortKey = (k: string) => (k === "custom_addon" ? 1 : k === "design_fee" ? 2 : 99);
  addons.sort((a, b) => sortKey(a.key) - sortKey(b.key) || a.key.localeCompare(b.key));

  const addonsTotal = addons.reduce((s, a) => s + a.amount, 0);
  const servicePrice = Math.max(0, finalPrice - addonsTotal);

  return { serviceName, color, finalPrice, servicePrice, addons, addonsTotal, designFee, customAddon };
}


