export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 智能檢測 API URL
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const hostname = window.location.hostname;
    if (hostname.includes('railway.app')) {
      // Railway 部署：嘗試後端服務 URL
      return `https://${hostname.replace('tattoo-crm-production', 'tattoo-crm-backend')}`;
    } else {
      // 其他生產環境
      return window.location.origin.replace(/:\d+$/, ':4000');
    }
  }
  
  // 開發環境
  return "http://localhost:4000";
}

const API_BASE = getApiBase();

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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, data: data ?? text };
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

  const res = await fetch(`${API_BASE}/auth/refresh`, {
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

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshOnce();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      return fetch(`${API_BASE}${path}`, {
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

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  return parseOrThrow(res);
}

// 別名導出
export { postJSON as postJson };