const membershipLevelZhMap: Record<string, string> = {
  // UI/legacy values
  Bronze: "青銅",
  Silver: "白銀",
  Gold: "黃金",
  Platinum: "鑽石",
  // normalized/uppercase values
  BRONZE: "青銅",
  SILVER: "白銀",
  GOLD: "黃金",
  PLATINUM: "鑽石",
};

export function formatMembershipLevel(level?: string | null): string {
  if (!level) return "未設定";
  return membershipLevelZhMap[level] ?? level;
}


