export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 智能檢測 API URL
function detectApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const hostname = window.location.hostname;
    if (hostname.includes('railway.app')) {
      // Railway 部署：前端和後端是分開的服務
      // 前端：tattoo-crm-production.up.railway.app
      // 後端：tattoo-crm-backend-production.up.railway.app
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        return backendUrl;
      }
      // 如果沒有設定後端 URL，嘗試推測後端 URL
      // Railway 的後端服務通常有不同的子域名
      if (hostname.includes('frontend')) {
        return hostname.replace('frontend', 'backend');
      } else if (hostname.includes('tattoo-crm-production')) {
        // 嘗試不同的後端 URL 模式
        const possibleBackendUrls = [
          hostname.replace('tattoo-crm-production', 'tattoo-crm-backend-production'),
          hostname.replace('tattoo-crm-production', 'tattoo-crm-production-backend'),
          hostname.replace('tattoo-crm-production', 'tattoo-crm-backend'),
          // 如果以上都不行，嘗試添加 -backend 後綴
          hostname.replace('.up.railway.app', '-backend.up.railway.app'),
        ];
        
        // 返回第一個可能的 URL，讓瀏覽器嘗試
        return possibleBackendUrls[0];
      } else {
        // 如果無法推測，使用同一個域名（可能會有問題）
        return `https://${hostname}`;
      }
    } else {
      // 其他生產環境
      return window.location.origin.replace(/:\d+$/, ':4000');
    }
  }
  
  // 開發環境
  return "http://localhost:4000";
}

// 檢查後端服務狀態
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const backendUrl = await detectBackendUrl();
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
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
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔍 Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    console.log('🔍 Using localhost for development');
    return "http://localhost:4000";
  }
  
  const hostname = window.location.hostname;
  console.log('🔍 Current hostname:', hostname);
  
  if (hostname.includes('railway.app')) {
    // 基於 Railway 的常見命名模式，直接返回最可能的後端 URL
    const backendUrl = 'https://tattoo-crm-backend-production.up.railway.app';
    console.log('🔍 Using hardcoded backend URL:', backendUrl);
    
    // 測試 URL 是否可用
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      console.log('🔍 Backend health check status:', response.status);
      
      if (response.ok) {
        console.log('✅ Backend URL is working:', backendUrl);
        return backendUrl;
      } else {
        console.warn('⚠️ Backend URL returned status:', response.status);
        // 即使健康檢查失敗，也返回這個 URL，因為可能是認證問題
        return backendUrl;
      }
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error);
      // 即使健康檢查失敗，也返回這個 URL
      return backendUrl;
    }
  }
  
  console.log('🔍 Using hostname as fallback:', `https://${hostname}`);
  return `https://${hostname}`;
}

const API_BASE = detectApiBase();

// 調試信息
if (typeof window !== 'undefined') {
  console.log('🔍 API Base URL:', API_BASE);
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
  return API_BASE;
}

export async function postJSON<T>(path: string, body: Record<string, unknown> | unknown) {
  try {
    const backendUrl = await detectBackendUrl();
    const res = await fetch(`${backendUrl}${path}`, {
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
    // 如果是網路錯誤，提供更友好的錯誤訊息
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

  // 使用動態檢測的後端 URL
  const backendUrl = await detectBackendUrl();
  
  const res = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshOnce();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      const backendUrl = await detectBackendUrl();
      return fetch(`${backendUrl}${path}`, {
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
    throw new ApiError(res.status, err.message || "Request failed");
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