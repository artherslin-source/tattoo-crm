export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "—";
  // TWD amounts are stored as integers; if a float sneaks in, round to integer.
  const i = Math.round(n);
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(i);
}


