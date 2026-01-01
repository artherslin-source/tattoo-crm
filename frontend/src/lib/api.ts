import { fetchWithRetry } from './api-fallback';

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// 檢查後端服務狀態（帶重試機制）
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const backendUrl = await detectBackendUrl();
    const response = await fetchWithRetry(`${backendUrl}/health/simple`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// 智能檢測後端 URL
export async function detectBackendUrl(): Promise<string> {
  console.log('🔍 detectBackendUrl() called');
  
  const normalizeBase = (base: string) => base.replace(/\/+$/, '');

  const probeHealth = async (base: string): Promise<boolean> => {
    const clean = normalizeBase(base);
    try {
      // backend health endpoint is `/health/simple` (avoid false negatives / CORS noise on `/health`)
      const res = await fetch(`${clean}/health/simple`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const envUrlRaw = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  const envUrl = envUrlRaw ? normalizeBase(envUrlRaw) : null;
  
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    console.log('🔍 Using localhost for development');
    return "http://localhost:4000";
  }
  
  const hostname = window.location.hostname;
  console.log('🔍 Current hostname:', hostname);
  
  if (hostname.includes('railway.app')) {
    // Railway：嘗試用常見命名模式推測後端 URL，並用 /health 探測可用者
    const current = `https://${hostname}`;
    // 注意：Railway 上 env URL 有機會指到「舊後端/錯的 service」。
    // 我們把「推測的後端」放前面優先 probe；env URL 只做最後備援。
    const candidatesRaw: string[] = [
      // common: tattoo-crm-production -> tattoo-crm-backend-production
      current.replace('tattoo-crm-production', 'tattoo-crm-backend-production'),
      // common: frontend -> backend
      current.replace('frontend', 'backend'),
      // common suffix: -backend
      current.replace('.up.railway.app', '-backend.up.railway.app'),
      ...(envUrl ? [envUrl] : []),
    ].filter(Boolean);

    const seen = new Set<string>();
    const candidates = candidatesRaw
      .map(normalizeBase)
      .filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

    console.log('🔍 Railway backend URL candidates:', candidates);

    for (const base of candidates) {
      const ok = await probeHealth(base);
      console.log('🔍 Probe /health/simple:', { base, ok });
      if (ok) {
        console.log('✅ Using inferred healthy backend URL:', base);
        return base;
      }
    }

    console.warn('⚠️ No healthy backend candidate found; falling back to first candidate (may fail).');
    return candidates[0] ?? current;
  }
  
  if (envUrl) {
    console.log('🔍 Using env backend URL candidate:', envUrl);
    const ok = await probeHealth(envUrl);
    if (ok) {
      console.log('✅ Env backend URL is healthy:', envUrl);
      return envUrl;
    }
    console.warn('⚠️ Env backend URL health check failed; falling back to hostname.');
  }

  console.log('🔍 Using hostname as fallback:', `https://${hostname}`);
  return `https://${hostname}`;
}

// 動態獲取 API Base URL
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return "http://localhost:4000";
  }
  
  const normalizeBase = (base: string) => base.replace(/\/+$/, '');
  const hostname = window.location.hostname;
  if (hostname.includes('railway.app')) {
    const current = `https://${hostname}`;
    // best-effort inference (sync path; detectBackendUrl() will do real probing)
    if (hostname.includes('tattoo-crm-production')) {
      return normalizeBase(current.replace('tattoo-crm-production', 'tattoo-crm-backend-production'));
    }
    if (hostname.includes('frontend')) {
      return normalizeBase(current.replace('frontend', 'backend'));
    }
    return normalizeBase(current.replace('.up.railway.app', '-backend.up.railway.app'));
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) return normalizeBase(envUrl);
  
  return "http://localhost:4000";
}

// 調試信息
if (typeof window !== 'undefined') {
  console.log('🔍 API Base URL:', getApiBaseUrl());
  console.log('🔍 Current hostname:', window.location.hostname);
  console.log('🔍 Environment:', process.env.NODE_ENV);
}

function readFromLocalStorage(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocalStorage(key: string, val: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, val);
  } catch {}
}

export function getAccessToken(): string | null {
  // 先讀 localStorage；若你們有把 token 放 cookie，也可在這裡補 cookie 讀取
  return readFromLocalStorage("accessToken");
}

export function getRefreshToken(): string | null {
  return readFromLocalStorage("refreshToken");
}

export function saveTokens(accessToken: string, refreshToken?: string, userRole?: string, userBranchId?: string) {
  writeToLocalStorage("accessToken", accessToken);
  if (refreshToken) writeToLocalStorage("refreshToken", refreshToken);
  if (userRole) writeToLocalStorage("userRole", userRole);
  if (userBranchId) writeToLocalStorage("userBranchId", userBranchId);
}

export function getApiBase() {
  return getApiBaseUrl();
}

/**
 * 將圖片相對路徑轉換為完整的後端 URL
 * 支援 `/uploads/...` 格式的相對路徑
 * 在 SSR 和客戶端都能正常工作
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return '';
  }
  
  // 如果已經是完整的 URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 在 SSR 環境中，使用環境變數或默認值
  if (typeof window === 'undefined') {
    // SSR 環境
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${backendUrl}${cleanPath}`;
  }
  
  // 客戶端環境
  const backendUrl = getApiBaseUrl();
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendUrl}${cleanPath}`;
}

export async function postJSON(path: string, body: Record<string, unknown> | unknown) {
  try {
    const backendUrl = await detectBackendUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const res = await fetchWithRetry(`${backendUrl}${normalizedPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, data: data ?? text };
  } catch (error) {
    console.error('postJSON fetch error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, '無法連接到伺服器，請檢查網路連線或稍後再試');
    }
    throw error;
  }
}

// 認證相關函數
export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userRole');
}

export function getUserBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userBranchId');
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userBranchId');
}


async function tryRefreshOnce(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const backendUrl = await detectBackendUrl();
  const res = await fetch(`${backendUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
    credentials: "include",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => ({}));
  // 依你們的 refresh 回傳格式調整這兩個 key 名稱
  const newAccess = data.accessToken || data.token || null;
  const newRefresh = data.refreshToken || null;
  if (newAccess) saveTokens(newAccess, newRefresh ?? undefined);
  return newAccess;
}

async function withAuthFetch(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // 對於圖片管理API使用相對路徑，其他API使用絕對路徑
  const isImageApi = path.includes('/admin/services/images');
  
  let url: string;
  if (isImageApi) {
    // 使用相對路徑，讓 Next.js rewrite 處理
    url = path;
  } else {
    // 使用動態檢測的後端 URL
    const backendUrl = await detectBackendUrl();
    url = `${backendUrl}${path}`;
  }
  
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshOnce();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      return fetch(url, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }

  return res;
}

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new ApiError(res.status, err.message || "Request failed", err);
  }
  return res.json();
}

export async function getJsonWithAuth<T>(path: string): Promise<T> {
  const res = await withAuthFetch(path, { method: "GET" });
  return parseOrThrow(res);
}

export async function postJsonWithAuth<T>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await withAuthFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseOrThrow(res);
}

export async function patchJsonWithAuth<T>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await withAuthFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseOrThrow(res);
}

export async function putJsonWithAuth<T>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await withAuthFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return parseOrThrow(res);
}

export async function deleteJsonWithAuth<T>(path: string): Promise<T> {
  const res = await withAuthFetch(path, { method: "DELETE" });
  return parseOrThrow(res);
}

export async function postFormDataWithAuth<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // 不要設置 Content-Type，讓瀏覽器自動設置 multipart/form-data

  // 使用動態檢測的後端 URL
  const backendUrl = await detectBackendUrl();
  
  const res = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  return parseOrThrow(res);
}

// 別名導出
export { postJSON as postJson };