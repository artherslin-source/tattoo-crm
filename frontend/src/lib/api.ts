// src/lib/api.ts
// A strict, typed helper around fetch for Next.js App Router (no `any`).

/** Trim trailing slashes to avoid `//` in URLs */
const trimSlash = (s: string): string => s.replace(/\/+$/, "");

/** Base URL from env (optional). If empty and you call a relative path, we'll throw. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

/** HTTP methods we support */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A typed error carrying HTTP status and parsed body (when available) */
export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Key-value object for query strings */
export type Query = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Options for apiFetch */
export interface ApiOptions<B = unknown> extends RequestInit {
  method?: HttpMethod;
  /** Query string parameters */
  query?: Query;
  /** Body (will be JSON.stringified if not FormData/Blob/ArrayBuffer) */
  body?: B;
  /** Whether to attach Authorization header from localStorage token */
  useAuth?: boolean;
  /** Explicit token to use for Authorization (overrides useAuth) */
  token?: string | null;
}

/** Encode query object into `key=value&...` safely */
const encodeQuery = (query?: Query): string => {
  if (!query) return "";
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
};

/** Build absolute URL from base + path + query */
const buildUrl = (path: string, query?: Query): string => {
  const qs = encodeQuery(query);

  // Absolute URL passed in
  if (/^https?:\/\//i.test(path)) return `${trimSlash(path)}${qs}`;

  // Relative path — need a base
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is empty. Set it in Railway Variables or use an absolute URL when calling apiFetch."
    );
  }
  return `${trimSlash(API_BASE_URL)}${path.startsWith("/") ? "" : "/"}${path}${qs}`;
};

/** Try parsing JSON safely (for both ok and error responses) */
const parseJsonSafely = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // not JSON
  }
};

/** Read token from localStorage on the client (SSR-safe) */
const getClientToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    // 依你的專案實際 key 如 'accessToken'、'token' 等擇一或都試
    return (
      window.localStorage.getItem("accessToken") ??
      window.localStorage.getItem("token")
    );
  } catch {
    return null;
  }
};

/** Core fetch helper (generic, strictly typed) */
export async function apiFetch<TResponse, TBody = unknown>(
  path: string,
  options: ApiOptions<TBody> = {}
): Promise<TResponse> {
  const {
    method = "GET",
    query,
    body,
    headers,
    useAuth = false,
    token,
    ...rest
  } = options;

  const url = buildUrl(path, query);

  // Build headers safely
  const finalHeaders = new Headers(headers ?? {});

  // Attach Authorization if requested
  const bearer = token ?? (useAuth ? getClientToken() : null);
  if (bearer && !finalHeaders.has("Authorization")) {
    finalHeaders.set("Authorization", `Bearer ${bearer}`);
  }

  // Attach JSON content-type if body is plain object
  let fetchInit: RequestInit = { ...rest, method, headers: finalHeaders };

  if (body !== undefined && body !== null && method !== "GET") {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
    const isArrayBuffer = body instanceof ArrayBuffer;

    if (!isFormData && !isBlob && !isArrayBuffer) {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
      fetchInit = { ...fetchInit, body: JSON.stringify(body) };
    } else {
      // Let browser set multipart or appropriate headers
      fetchInit = { ...fetchInit, body: body as BodyInit };
    }
  }

  const res = await fetch(url, fetchInit);
  const data = await parseJsonSafely(res);

  if (!res.ok) {
    const message =
      (typeof data === "object" &&
        data !== null &&
        // 常見的錯誤格式 { message: string } 或 { error: string }
        (("message" in data && String((data as { message: unknown }).message)) ||
          ("error" in data && String((data as { error: unknown }).error)))) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

/* ------------------------------
 * Convenience wrappers
 * ------------------------------ */

export const api = {
  get: <T>(path: string, opt?: Omit<ApiOptions<never>, "method" | "body">) =>
    apiFetch<T>(path, { ...opt, method: "GET" }),

  post: <T, B = unknown>(
    path: string,
    body?: B,
    opt?: Omit<ApiOptions<B>, "method">
  ) => apiFetch<T, B>(path, { ...opt, method: "POST", body }),

  put: <T, B = unknown>(
    path: string,
    body?: B,
    opt?: Omit<ApiOptions<B>, "method">
  ) => apiFetch<T, B>(path, { ...opt, method: "PUT", body }),

  patch: <T, B = unknown>(
    path: string,
    body?: B,
    opt?: Omit<ApiOptions<B>, "method">
  ) => apiFetch<T, B>(path, { ...opt, method: "PATCH", body }),

  delete: <T>(path: string, opt?: Omit<ApiOptions<never>, "method" | "body">) =>
    apiFetch<T>(path, { ...opt, method: "DELETE" }),
};
