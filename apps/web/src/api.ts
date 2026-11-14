const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const WRITE_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

let csrfToken = "";
let csrfPromise: Promise<void> | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function send(path: string, init: RequestInit, method: string, headers: Headers): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, { ...init, method, headers, credentials: "include" });
  } catch {
    throw new ApiError("Cannot reach the server. Confirm the API is running on port 4000.", 0, "NETWORK");
  }
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const needsCsrf = WRITE_METHODS.has(method) && !path.endsWith("/auth/login");
  if (needsCsrf) {
    if (!csrfToken) await refreshCsrf();
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await send(path, init, method, headers);
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (response.ok) return data as T;

  const code: string | undefined = data?.error?.code;

  // Session token went stale: fetch a new one and retry the write once.
  if (needsCsrf && !retried && response.status === 403 && code === "CSRF_INVALID") {
    await refreshCsrf(true);
    return request<T>(path, init, true);
  }

  if (response.status === 429) {
    throw new ApiError("Too many attempts. Wait a few minutes and try again.", 429, "RATE_LIMITED");
  }

  throw new ApiError(data?.error?.message ?? `Request failed (${response.status})`, response.status, code);
}

export function refreshCsrf(force = false): Promise<void> {
  if (!force && csrfToken) return Promise.resolve();
  if (!csrfPromise) {
    csrfPromise = request<{ csrfToken: string }>("/auth/csrf")
      .then(result => { csrfToken = result.csrfToken; })
      .finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

export function clearCsrf() {
  csrfToken = "";
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  setCsrf: (token: string) => { csrfToken = token; }
};