import { fetchWithRetry } from './api-fallback';
import { API_BASE, apiUrl } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ==========================================
// LocalStorage Helpers
// ==========================================

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

// ==========================================
// Token Management
// ==========================================

export function getAccessToken(): string | null {
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

export function getUserRole(): string | null {
  return readFromLocalStorage("userRole");
}

export function getUserBranchId(): string | null {
  return readFromLocalStorage("userBranchId");
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userBranchId");
}

// ==========================================
// API Base Getters (for backwards compatibility)
// ==========================================

export function getApiBase(): string {
  return API_BASE;
}

// ==========================================
// Backend Health Check
// ==========================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetchWithRetry(apiUrl('/health/simple'), {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// ==========================================
// Simple POST JSON (for login, no auth)
// ==========================================

export async function postJSON(path: string, body: Record<string, unknown> | unknown) {
  try {
    const url = apiUrl(path);
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

// ==========================================
// Refresh Token Logic
// ==========================================

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const refreshUrl = apiUrl('/auth/refresh');
  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include',
  });

  if (!response.ok) return null;

  const data = await response.json().catch(() => ({}));
  const newAccessToken = data.accessToken || data.token || null;
  const newRefreshToken = data.refreshToken || null;

  if (newAccessToken) {
    saveTokens(newAccessToken, newRefreshToken ?? undefined);
  }

  return newAccessToken;
}

// ==========================================
// Authenticated Fetch Wrapper
// ==========================================

async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  retryRefresh: boolean = true
): Promise<Response> {
  const url = apiUrl(path);
  const accessToken = getAccessToken();
  const headers = new Headers(options.headers ?? {});

  headers.set('Accept', 'application/json');
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If 401 and we can retry, try refreshing token
  if (response.status === 401 && retryRefresh) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  return response;
}

// ==========================================
// Response Parser
// ==========================================

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, errorData.message || 'Request failed');
  }
  return response.json();
}

// ==========================================
// Convenience Methods
// ==========================================

export async function getJSON<T = unknown>(path: string): Promise<T> {
  return parseResponse(await fetchWithAuth(path, { method: 'GET' }));
}

export async function postJSONWithAuth<T = unknown>(path: string, body: unknown): Promise<T> {
  return parseResponse(
    await fetchWithAuth(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}

export async function patchJSON<T = unknown>(path: string, body: unknown): Promise<T> {
  return parseResponse(
    await fetchWithAuth(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  );
}

export async function putJSON<T = unknown>(path: string, body: unknown): Promise<T> {
  return parseResponse(
    await fetchWithAuth(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  );
}

export async function deleteJSON<T = unknown>(path: string): Promise<T> {
  return parseResponse(await fetchWithAuth(path, { method: 'DELETE' }));
}

export async function uploadFile<T = unknown>(path: string, formData: FormData): Promise<T> {
  const url = apiUrl(path);
  const accessToken = getAccessToken();
  const headers = new Headers();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return parseResponse(
    await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    })
  );
}
