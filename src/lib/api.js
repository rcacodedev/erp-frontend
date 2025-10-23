// src/lib/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL; // ej: http://localhost:8000
const AUTH_REFRESH_PATH = "/api/v1/auth/refresh";

// ---------- Tokens ----------
export function getAccess() {
  return localStorage.getItem("access");
}
export function getRefresh() {
  return localStorage.getItem("refresh");
}
export function setAccess(tok) {
  localStorage.setItem("access", tok);
}
export function setRefresh(tok) {
  localStorage.setItem("refresh", tok);
}
export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// Org slug (ajústalo a tu realidad si lo guardas en otro sitio)
export function getOrgSlug() {
  return localStorage.getItem("org_slug") || "acme";
}

// ---------- Axios instance ----------
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15000,
});

// Añade Authorization automáticamente si hay access
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Coordina refresh para evitar múltiples llamadas simultáneas
let isRefreshing = false;
let refreshQueue = [];
const onRefreshed = (newAccess) => {
  refreshQueue.forEach((cb) => cb(newAccess));
  refreshQueue = [];
};
const addToQueue = (cb) => refreshQueue.push(cb);

// Auto-refresh en 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (!response) return Promise.reject(error);
    if (response.status !== 401) return Promise.reject(error);

    const isRefreshCall = config?.url?.endsWith(AUTH_REFRESH_PATH);
    if (isRefreshCall) {
      clearTokens();
      try {
        const current = window.location.pathname + window.location.search;
        window.location.assign(`/login?next=${encodeURIComponent(current)}`);
      } catch {}
      return Promise.reject(error);
    }

    if (config._retry) return Promise.reject(error);
    config._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addToQueue((newAccess) => {
          if (!newAccess) return reject(error);
          config.headers.Authorization = `Bearer ${newAccess}`;
          resolve(api.request(config));
        });
      });
    }

    isRefreshing = true;
    const refresh = getRefresh();
    if (!refresh) {
      clearTokens();
      try {
        const current = window.location.pathname + window.location.search;
        window.location.assign(`/login?next=${encodeURIComponent(current)}`);
      } catch {}
      isRefreshing = false;
      onRefreshed(null);
      return Promise.reject(error);
    }

    try {
      const refreshUrl = `${API_BASE}${AUTH_REFRESH_PATH}`;
      const res = await axios.post(refreshUrl, { refresh });
      const newAccess = res.data?.access;
      if (!newAccess) throw new Error("No access token in refresh response");

      setAccess(newAccess);
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
      isRefreshing = false;
      onRefreshed(newAccess);

      config.headers.Authorization = `Bearer ${newAccess}`;
      return api.request(config);
    } catch (e) {
      clearTokens();
      try {
        const current = window.location.pathname + window.location.search;
        window.location.assign(`/login?next=${encodeURIComponent(current)}`);
      } catch {}
      isRefreshing = false;
      onRefreshed(null);
      return Promise.reject(e);
    }
  }
);

// ---------- apiFetch (compat con tus páginas) ----------
export async function apiFetch(path, opts = {}, token) {
  const method = (opts.method || "GET").toLowerCase();
  const headers = { ...(opts.headers || {}) };

  // Si te pasan token manual, úsalo (sino, el interceptor ya añade el access)
  if (token) headers.Authorization = `Bearer ${token}`;

  // Si viene body como string JSON (estilo fetch), parsea a objeto para axios
  const data = opts.body
    ? typeof opts.body === "string"
      ? JSON.parse(opts.body)
      : opts.body
    : undefined;

  const res = await api.request({
    url: path,
    method,
    headers,
    data,
    params: opts.params,
  });
  return res.data;
}

export default api;
