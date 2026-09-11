const fromEnv = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Production goes through Netlify `/api` so the browser is same-origin.
// Locally we still hit the API host from env (or localhost).
export const API = import.meta.env.DEV
  ? fromEnv || "http://127.0.0.1:8001"
  : "/api";

export function apiUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API}${suffix}`;
}
