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
    // Browser: prefer same-origin rewrites to avoid CORS noise and cross-service mismatch.
    if (typeof window !== 'undefined') {
      const response = await fetchWithRetry(`/api/health/simple`, { method: 'GET' });
      if (response.status !== 404) return response.ok;
      // If rewrites are not active (404), fall back to direct backend probe so login won't be blocked.
    }

    const backendUrl = await detectBackendUrl();
    const response = await fetchWithRetry(`${backendUrl}/health/simple`, { method: 'GET' });
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

  const envUrlRaw = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  const envUrl = envUrlRaw ? normalizeBase(envUrlRaw) : null;
  
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    console.log('🔍 Using localhost for development');
    return "http://localhost:4000";
  }
  
  const hostname = window.location.hostname;
  console.log('🔍 Current hostname:', hostname);
  
  if (hostname.includes('railway.app')) {
    const current = `https://${hostname}`;
    // Browser 端跨網域 probe 很容易被 CORS/Edge error 擋住而誤判。
    // 在 Railway 我們改成「優先 envUrl，其次用已知的 backend hostname 規則」。
    if (envUrl) return envUrl;
    if (hostname.includes('tattoo-crm-production')) {
      return normalizeBase(current.replace('tattoo-crm-production', 'tattoo-crm-production-413f'));
    }
    return normalizeBase(current);
  }

  if (envUrl) {
    console.log('🔍 Using env backend URL candidate:', envUrl);
    return envUrl;
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
      return normalizeBase(current.replace('tattoo-crm-production', 'tattoo-crm-production-413f'));
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
  
  // 客戶端環境：走同網域 `/uploads` rewrites，避免跨網域 CORS / host drift
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return cleanPath;
}

/**
 * 回傳圖片的「絕對後端 URL」，供後台 Next/Image 或需要從後端直接載入的場景使用。
 * 後台作品管理使用此函式可避免同源 rewrite 在 Image 優化時失效（Zeabur 等）。
 */
export function getImageUrlAbsolute(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return '';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const base = typeof window !== 'undefined'
    ? getApiBaseUrl()
    : (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${base.replace(/\/+$/, '')}${cleanPath}`;
}

export async function postJSON(path: string, body: Record<string, unknown> | unknown) {
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Browser: same-origin rewrites; Server: direct backend url
    const url =
      typeof window !== 'undefined'
        ? `/api${normalizedPath}`
        : `${await detectBackendUrl()}${normalizedPath}`;

    const res = await fetchWithRetry(url, {
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
  const v = localStorage.getItem('userRole');
  if (v) return v;
  // Fallback: decode from access token so admin access can still work during maintenance
  // (when /users/me might be blocked by maintenance middleware).
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === 'string' ? payload.role : null;
  if (role) localStorage.setItem('userRole', role);
  return role;
}

export function getUserBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem('userBranchId');
  if (v) return v;
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const branchId = typeof payload?.branchId === 'string' ? payload.branchId : null;
  if (branchId) localStorage.setItem('userBranchId', branchId);
  return branchId;
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userBranchId');
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    return null;
  }
}


async function tryRefreshOnce(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const url =
    typeof window !== 'undefined' ? `/api/auth/refresh` : `${await detectBackendUrl()}/auth/refresh`;
  const res = await fetch(url, {
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Artist branch switch support (client-side only):
  // If user is ARTIST and selected a specific branch, append `branchId=` to requests
  // so both list queries and create/update actions can follow the sidebar branch switch.
  let finalPath = normalizedPath;
  try {
    if (typeof window !== 'undefined') {
      const role = window.localStorage.getItem('userRole') || '';
      const normalizedRole = role.toUpperCase();
      const selected = window.localStorage.getItem('artistSelectedBranchId') || '';
      if (normalizedRole === 'ARTIST' && selected && selected !== 'all') {
        const u = new URL(`/api${normalizedPath}`, window.location.origin);
        if (!u.searchParams.has('branchId')) u.searchParams.set('branchId', selected);
        finalPath = u.pathname.replace(/^\/api/, '') + (u.search ? u.search : '');
      }
    }
  } catch {
    // ignore
  }

  // Browser: always use same-origin rewrites to avoid CORS and backend URL drift.
  // Server (SSR): keep using detected backend URL.
  const url =
    typeof window !== 'undefined'
      ? `/api${finalPath}`
      : `${await detectBackendUrl()}${normalizedPath}`;
  
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

export async function deleteJsonWithAuth<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: "DELETE" };
  // Some endpoints (e.g. admin hard delete) require a JSON body (reason, etc).
  // Keep backward-compatible: only send body when provided.
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await withAuthFetch(path, init);
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url =
    typeof window !== 'undefined'
      ? `/api${normalizedPath}`
      : `${await detectBackendUrl()}${normalizedPath}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  return parseOrThrow(res);
}

// 別名導出
export { postJSON as postJson };