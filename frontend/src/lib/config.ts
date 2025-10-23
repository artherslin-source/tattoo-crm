export const NODE_ENV = process.env.NODE_ENV;

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

// 在非開發（含 staging/production）環境，沒有設定就硬 fail
if (typeof window === "undefined") {
  if (NODE_ENV !== "development" && !apiBase) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required in staging/production builds."
    );
  }
}

export const API_BASE =
  apiBase || "http://localhost:4000"; // 開發 fallback

export function apiUrl(path: string) {
  // 強制所有路徑都有 /api 前綴
  const p = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  return `${API_BASE}${p}`;
}

