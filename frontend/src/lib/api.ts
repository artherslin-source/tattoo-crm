// src/lib/api.ts
// ✅ 全面修正版：兼容舊版函式名稱 + 型別安全 + Railway/Next.js 可部署

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface JsonRequestInit extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string | null;
}

/* ------------------------- 公用工具 ------------------------- */

function toQueryString(query?: JsonRequestInit['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  return params.toString() ? `?${params.toString()}` : '';
}

function buildUrl(path: string, query?: JsonRequestInit['query']): string {
  const base = API_BASE_URL || '';
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}${toQueryString(query)}`;
}

async function parseJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* --------------------- Token 相關函式 --------------------- */

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem('accessToken');
    if (token) return token;
    const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string };
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

/* --------------------- 主核心 fetch --------------------- */

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
    const isBlob =
      typeof Blob !== 'undefined' && body instanceof Blob;
    const isBuffer = body instanceof ArrayBuffer;

    if (!isForm && !isBlob && !isBuffer && typeof body !== 'string') {
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
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as TResponse;
}

/* ------------------ 基本 HTTP 方法封裝 ------------------ */

export function getJSON<TResponse>(path: string, init?: JsonRequestInit) {
  return requestJSON<TResponse>(path, 'GET', undefined, init);
}
export function postJSON<TResponse, TBody = unknown>(path: string, body?: TBody, init?: JsonRequestInit) {
  return requestJSON<TResponse, TBody>(path, 'POST', body, init);
}
export function putJSON<TResponse, TBody = unknown>(path: string, body?: TBody, init?: JsonRequestInit) {
  return requestJSON<TResponse, TBody>(path, 'PUT', body, init);
}
export function patchJSON<TResponse, TBody = unknown>(path: string, body?: TBody, init?: JsonRequestInit) {
  return requestJSON<TResponse, TBody>(path, 'PATCH', body, init);
}
export function deleteJSON<TResponse>(path: string, init?: JsonRequestInit) {
  return requestJSON<TResponse>(path, 'DELETE', undefined, init);
}

/* ------------------ 舊版相容匯出名稱 ------------------ */
// ✅ 舊版本 import 的名稱都可直接對應到新版函式
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

export type { JsonRequestInit, HttpMethod };
