/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Centralized API helper for both server and client.
 * Provides JSON helpers, token storage, and backwards-compatible exports.
 */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** ---- Environment & base URL ----
 * ✅ 修正點 1：安全讀 env，缺失時於瀏覽器端 fallback 到現行網域，不在 build/SSR 直接崩潰
 */
const __RAW_ENV_BASE =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_API_URL) || '';

function __resolveApiBase(): string {
  const fromEnv = (__RAW_ENV_BASE || '').trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  // Browser fallback：若 env 缺失，使用目前前端網域，避免 build/SSR 當場爆掉
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  // SSR 且沒有 env：保持空字串，等到 getApiBase() 呼叫時再丟出清楚錯誤
  return '';
}

export function getApiBase(): string {
  const base = __resolveApiBase();
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not set and no browser origin is available. Please set it in your frontend Variables.');
  }
  return base;
}

/** ---- Token utils (no-op on server) ---- */
export type TokensLike =
  | { accessToken?: string | null; refreshToken?: string | null }
  | { token?: string | null }
  | Record<string, any>;

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const BRANCH_ID_KEY = 'branchId';
const ROLE_KEY = 'role';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function saveTokens(input: TokensLike): void {
  if (!isBrowser()) return;
  try {
    const at =
      (input as any).accessToken ?? (input as any).token ?? (input as any)?.data?.accessToken;
    const rt =
      (input as any).refreshToken ?? (input as any)?.data?.refreshToken;
    if (at) window.localStorage.setItem(ACCESS_KEY, String(at));
    if (rt) window.localStorage.setItem(REFRESH_KEY, String(rt));
  } catch {
    /* ignore */
  }
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getUserBranchId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(BRANCH_ID_KEY);
  } catch {
    return null;
  }
}

export function setUserBranchId(branchId: string | null): void {
  if (!isBrowser()) return;
  try {
    if (branchId) window.localStorage.setItem(BRANCH_ID_KEY, branchId);
    else window.localStorage.removeItem(BRANCH_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function getUserRole(): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ROLE_KEY);
    return raw ?? null;
  } catch {
    return null;
  }
}

export function setUserRole(role: string | null): void {
  if (!isBrowser()) return;
  try {
    if (role) window.localStorage.setItem(ROLE_KEY, role);
    else window.localStorage.removeItem(ROLE_KEY);
  } catch {
    /* ignore */
  }
}

/** ---- Request helpers ---- */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type JsonRequestInit = Omit<RequestInit, 'body' | 'method' | 'headers'> & {
  headers?: HeadersInit;
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function toQueryString(
  query?: JsonRequestInit['query']
): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * ✅ 修正點 2：若傳入的是絕對網址（http/https），直接放行，不強制拼 base
 */
function buildUrl(path: string, query?: JsonRequestInit['query']): string {
  if (/^https?:\/\//i.test(path)) {
    const clean = path.replace(/\/+$/, '');
    return `${clean}${toQueryString(query)}`;
  }
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}${toQueryString(query)}`;
}

async function parseJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // allow non-JSON error bodies
  }
}

async function requestJSON<TResponse, TBody = unknown>(
  path: string,
  method: HttpMethod,
  body?: TBody,
  init: JsonRequestInit = {}
): Promise<TResponse> {
  const url = buildUrl(path, init.query);

  const headers = new Headers(init.headers);
  const token = init.token ?? getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let fetchInit: RequestInit = { ...init, method, headers };

  if (body !== undefined && body !== null && method !== 'GET') {
    const isForm =
      typeof FormData !== 'undefined' && body instanceof FormData;
    const isBlobLike =
      (typeof Blob !== 'undefined' && body instanceof Blob) ||
      (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer);
    if (!isForm && !isBlobLike && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      fetchInit = { ...fetchInit, body: JSON.stringify(body) };
    } else {
      fetchInit = { ...fetchInit, body: body as BodyInit };
    }
  }

  const res = await fetch(url, fetchInit);
  const data = await parseJsonSafely(res);

  if (!res.ok) {
    const message =
      (typeof data === 'object' &&
        data !== null &&
        (('message' in data && String((data as any).message)) ||
          ('error' in data && String((data as any).error)))) ||
      `Request failed with ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as TResponse;
}

/** JSON helpers */
export function getJSON<TResponse>(
  path: string,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse>(path, 'GET', undefined, init);
}

// Overload signatures：相容一或二個泛型的舊呼叫方式
export function postJSON<TResponse>(
  path: string,
  body?: unknown,
  init?: JsonRequestInit
): Promise<TResponse>;
export function postJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse>;
export function postJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'POST', body, init);
}

export function putJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'PUT', body, init);
}

export function patchJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'PATCH', body, init);
}

export function deleteJSON<TResponse = unknown>(
  path: string,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse>(path, 'DELETE', undefined, init);
}

/** FormData upload with auth */
export async function postFormDataWithAuth<TResponse>(
  path: string,
  formData: FormData,
  init?: Omit<JsonRequestInit, 'body'>
): Promise<TResponse> {
  return requestJSON<TResponse, FormData>(path, 'POST', formData, init);
}

/** ---- Backwards-compatible aliases (to fix “not exported” errors) ---- */

// simple aliases
export const getJsonWithAuth = getJSON;
export const postJsonWithAuth = postJSON;
export const putJsonWithAuth = putJSON;
export const patchJsonWithAuth = patchJSON;
export const deleteJsonWithAuth = deleteJSON;

// also export lowercase convenience (in case some files use these)
export const getJson = getJSON;
export const postJson = postJSON;
export const putJson = putJSON;
export const patchJson = patchJSON;
export const deleteJson = deleteJSON;

// 若有需要內部檢視 base，可保留這個名稱（避免其他檔案 import 失敗）
export { __RAW_ENV_BASE as __API_BASE_URL_INTERNAL__ };
