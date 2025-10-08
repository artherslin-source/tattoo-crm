/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Centralized API helper for both server and client (Next.js 15, App Router).
 * - SSR safe: no top-level window/localStorage access.
 * - Env handling: uses NEXT_PUBLIC_API_URL at build/runtime; falls back to window.origin only on client.
 * - Backward-compatible exports for existing imports across the app.
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

/* =========================================================
 * 1) Base URL (SSR 安全)
 * ======================================================= */

/** 原始環境變數字串（僅讀，不在頂層做 fallback） */
const __RAW_ENV_BASE =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_API_URL) ||
  '';

/** 僅在呼叫時解析 Base；SSR 無 env 時不會動用 window，避免「window is not defined」 */
function __resolveApiBase(): string {
  const envBase = (__RAW_ENV_BASE || '').trim().replace(/\/+$/, '');
  if (envBase) return envBase;

  // 只有在瀏覽器端才允許使用目前網域做為 fallback
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // 純 SSR 且沒有 env：回空字串；交由 getApiBase() 統一丟錯，避免在 import 時崩潰
  return '';
}

/** 提供外部統一取得 API Base；缺失時丟出清楚錯誤（便於 Railway 設定排查） */
export function getApiBase(): string {
  const base = __resolveApiBase();
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set and no browser origin is available. ' +
        'Please set it in your Frontend Variables (e.g. https://<your-backend>.up.railway.app).'
    );
  }
  return base;
}

/* =========================================================
 * 2) Token & 使用者資訊（僅瀏覽器存取）
 * ======================================================= */

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const BRANCH_ID_KEY = 'branchId';
const ROLE_KEY = 'role';

function isBrowser() {
  return typeof window !== 'undefined';
}

export type TokensLike =
  | { accessToken?: string | null; refreshToken?: string | null }
  | { token?: string | null }
  | Record<string, any>;

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

/* =========================================================
 * 3) 請求工具
 * ======================================================= */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type JsonRequestInit = Omit<RequestInit, 'body' | 'method' | 'headers'> & {
  headers?: HeadersInit;
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

/** 物件 -> 查詢字串 */
function toQueryString(query?: JsonRequestInit['query']): string {
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
 * 若 path 為絕對網址（http/https），直接使用，不與 Base 拼接。
 * 否則用 getApiBase() + path。
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

/** 安全解析 JSON（即使錯誤時也嘗試讀 body 供調試） */
async function parseJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 核心請求：所有 JSON 方法共用 */
async function requestJSON<TResponse, TBody = unknown>(
  path: string,
  method: HttpMethod,
  body?: TBody,
  init: JsonRequestInit = {}
): Promise<TResponse> {
  const url = buildUrl(path, init.query);

  const headers = new Headers(init.headers);
  // Token 來源：優先明傳其後嘗試 localStorage（僅瀏覽器）
  const token = init.token ?? getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let fetchInit: RequestInit = { ...init, method, headers };

  // 組裝 body
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

/* =========================================================
 * 4) 封裝的 CRUD 方法（含舊寫法相容）
 * ======================================================= */

export function getJSON<TResponse>(
  path: string,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse>(path, 'GET', undefined, init);
}

// 支援舊呼叫：postJSON<Res>(url, body) 與 postJSON<Res, Body>(url, body)
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

/** 上傳 FormData（自動帶 Auth） */
export function postFormDataWithAuth<TResponse>(
  path: string,
  formData: FormData,
  init?: Omit<JsonRequestInit, 'body'>
): Promise<TResponse> {
  return requestJSON<TResponse, FormData>(path, 'POST', formData, init);
}

/* =========================================================
 * 5) Backward-compatible 別名（避免 import 失敗）
 * ======================================================= */

export const getJsonWithAuth = getJSON;
export const postJsonWithAuth = postJSON;
export const putJsonWithAuth = putJSON;
export const patchJsonWithAuth = patchJSON;
export const deleteJsonWithAuth = deleteJSON;

export const getJson = getJSON;
export const postJson = postJSON;
export const putJson = putJSON;
export const patchJson = patchJSON;
export const deleteJson = deleteJSON;

// 供除錯觀察用（不要在業務程式依賴）
export { __RAW_ENV_BASE as __API_BASE_URL_INTERNAL__ };
