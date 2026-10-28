const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
let csrfToken = "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (["POST", "PATCH", "DELETE", "PUT"].includes(method) && !path.endsWith("/auth/login")) {
    if (!csrfToken) await refreshCsrf();
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`${API}${path}`, { ...init, method, headers, credentials: "include" });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message ?? `Request failed (${response.status})`);
  return data as T;
}
export async function refreshCsrf() {
  const result = await request<{ csrfToken: string }>("/auth/csrf");
  csrfToken = result.csrfToken;
}
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  setCsrf: (token: string) => { csrfToken = token; }
};
