export function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE as string;
  }
  return 'http://localhost:4000';
}

export type ApiError = { message: string; status: number };

export async function postJson<TBody extends Record<string, unknown>, TResp = unknown>(
  path: string,
  body: TBody,
): Promise<TResp> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}

export function saveTokens(tokens: { accessToken?: string; refreshToken?: string; role?: string; branchId?: string }) {
  if (typeof window === 'undefined') return;
  if (tokens.accessToken) localStorage.setItem('accessToken', tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
  if (tokens.role) localStorage.setItem('userRole', tokens.role);
  if (tokens.branchId) localStorage.setItem('userBranchId', tokens.branchId);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userBranchId');
}

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


export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  return fetch(`${getApiBase()}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function postJsonWithAuth<TBody extends Record<string, unknown>, TResp = unknown>(
  path: string,
  body: TBody,
): Promise<TResp> {
  const res = await fetchWithAuth(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}

export async function patchJsonWithAuth<TBody extends Record<string, unknown>, TResp = unknown>(
  path: string,
  body: TBody,
): Promise<TResp> {
  const res = await fetchWithAuth(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}

export async function getJsonWithAuth<TResp = unknown>(
  path: string,
): Promise<TResp> {
  const res = await fetchWithAuth(path, {
    method: 'GET',
  });
  
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}

export async function putJsonWithAuth<TBody extends Record<string, unknown>, TResp = unknown>(
  path: string,
  body: TBody,
): Promise<TResp> {
  const res = await fetchWithAuth(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}

export async function deleteJsonWithAuth<TResp = unknown>(
  path: string,
): Promise<TResp> {
  const res = await fetchWithAuth(path, {
    method: 'DELETE',
  });
  
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // ignore parse errors
    }
    throw { message, status: res.status } as ApiError;
  }
  return (await res.json()) as TResp;
}


