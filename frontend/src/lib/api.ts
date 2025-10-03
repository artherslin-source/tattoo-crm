export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function getApiBase() {
  return API_BASE;
}

export async function postJSON<T>(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, data: data ?? text };
}

// 認證相關函數
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

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

export function saveTokens(accessToken: string, refreshToken: string, userRole: string, userBranchId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('userRole', userRole);
  localStorage.setItem('userBranchId', userBranchId);
}

// 帶認證的 API 調用
export async function getJsonWithAuth<T>(path: string): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, errorData.message || 'Request failed');
  }

  return res.json();
}

export async function postJsonWithAuth<T>(path: string, body: any): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, errorData.message || 'Request failed');
  }

  return res.json();
}

export async function putJsonWithAuth<T>(path: string, body: any): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, errorData.message || 'Request failed');
  }

  return res.json();
}

export async function patchJsonWithAuth<T>(path: string, body: any): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, errorData.message || 'Request failed');
  }

  return res.json();
}

export async function deleteJsonWithAuth<T>(path: string): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(res.status, errorData.message || 'Request failed');
  }

  return res.json();
}

// API 錯誤類
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}