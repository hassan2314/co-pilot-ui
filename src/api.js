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

function messageFrom(data, fallback) {
  if (typeof data.detail === "string" && data.detail) return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg || String(item)).join(", ");
  }
  return data.error || fallback || "Request failed";
}

async function send(path, options) {
  const res = await fetch(apiUrl(path), options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFrom(data, res.statusText));
  return data;
}

export function fetchHealth() {
  return send("/health");
}

export function ingestFolder(folder) {
  return send("/v1/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
}

export function listDocuments() {
  return send("/v1/documents");
}

export function deleteDocument(path) {
  return send(`/v1/documents/${encodeURIComponent(path)}`, { method: "DELETE" });
}

export async function uploadFiles(files) {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  const res = await fetch(apiUrl("/v1/documents"), { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFrom(data, "Upload failed"));
  return data;
}

export function askQuestion(question) {
  return send("/v1/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export function readBrand(search = window.location.search) {
  const params = new URLSearchParams(search);
  const name = (params.get("name") || "Docs Assistant").slice(0, 60);
  let color = params.get("color") || "#2f5d50";
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) color = "#2f5d50";
  if (color.length === 4) {
    color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  const logo = safeLogo(params.get("logo") || "");
  return { name, color, logo };
}

export function safeLogo(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "";
}

export function embedSrc(brand) {
  const params = new URLSearchParams();
  params.set("name", brand.name);
  params.set("color", brand.color);
  if (brand.logo) params.set("logo", brand.logo);
  return `/embed?${params.toString()}`;
}
