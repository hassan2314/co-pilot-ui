export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";

export function apiUrl(path) {
  return `${API}${path}`;
}
