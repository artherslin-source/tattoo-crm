// src/lib/api.ts (drop-in replacement)
// Robust, typed JSON helper around fetch for the app router.
// No "any" types; works both on server and client components.

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** Narrow HTTP methods we support */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  /** HTTP status code returned by the server */
  status: number;
  /** Parsed body (if any) returned by the server for the error */
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Init options for our JSON helpers */
export interface JsonRequestInit
  extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  /** Extra headers to include */
  headers?: HeadersInit;
  /** Optional query params (will be serialized to the URL) */
  query?: Record<string, string | number | boolean | null | undefined>;
  /**
   * Access token to use for Authorization header.
   * If omitted, we'll try reading "accessToken" from localStorage on the client.
   */
  token?: string | null;
}

/** Serialize a query object to a query string */
function toQueryString(
  query?: JsonRequestInit['query']
): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Try to read the access token from localStorage (client only) */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

/** Build the absolute URL for a request */
function buildUrl(path: string, query?: JsonRequestInit['query']): string {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing NEXT_PUBLIC_API_URL. Please set it in your .env file.'
    );
  }
  const base = API_BASE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}${toQueryString(query)}`;
}

/** Safely parse a JSON response */
async function parseJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Not JSON (or invalid) — return the raw string so callers can inspect it.
    return text;
  }
}

/** Core request that all helpers use */
async function requestJSON<TResponse, TBody = unknown>(
  path: string,
  method: HttpMethod,
  body?: TBody,
  init: JsonRequestInit = {}
): Promise<TResponse> {
  const url = buildUrl(path, init.query);

  const headers = new Headers(init.headers);
  const token = init.token ?? getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let fetchInit: RequestInit = { ...init, method, headers };

  if (body !== undefined && body !== null && method !== 'GET') {
    // If body is already FormData/Blob/ArrayBufferView etc. leave it as-is
    // otherwise JSON-encode.
    const isFormLike =
      typeof FormData !== 'undefined' && body instanceof FormData;
    const isBlobLike =
      (typeof Blob !== 'undefined' && body instanceof Blob) ||
      (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer);

    if (!isFormLike && !isBlobLike && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      fetchInit = { ...fetchInit, body: JSON.stringify(body) };
    } else {
      fetchInit = { ...fetchInit, body: body as BodyInit };
    }
  }

  const res = await fetch(url, fetchInit);

  // Try to parse body (even on error) so callers get details
  const data = await parseJsonSafely(res);

  if (!res.ok) {
    const message =
      (typeof data === 'object' &&
        data !== null &&
        // common NestJS/Express error shapes
        (('message' in data && String((data as { message: unknown }).message)) ||
          ('error' in data && String((data as { error: unknown }).error)))) ||
      `Request failed with ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as TResponse;
}

/** GET JSON */
export function getJSON<TResponse>(
  path: string,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse>(path, 'GET', undefined, init);
}

/** POST JSON */
export function postJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'POST', body, init);
}

/** PUT JSON */
export function putJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'PUT', body, init);
}

/** PATCH JSON */
export function patchJSON<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse, TBody>(path, 'PATCH', body, init);
}

/** DELETE JSON */
export function deleteJSON<TResponse>(
  path: string,
  init?: JsonRequestInit
): Promise<TResponse> {
  return requestJSON<TResponse>(path, 'DELETE', undefined, init);
}

/** Upload helper for FormData (files) */
export function uploadForm<TResponse>(
  path: string,
  form: FormData,
  init?: JsonRequestInit
): Promise<TResponse> {
  // Do not set content-type; the browser will set the proper multipart boundary.
  return requestJSON<TResponse, FormData>(path, 'POST', form, init);
}
