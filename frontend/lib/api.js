import axios from "axios";
import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove("access_token");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/* ── Auth ──────────────────────────────────────────────────────────── */
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
  google:   (credential) => api.post("/auth/google", { credential, token: credential }),
  me:       ()     => api.get("/auth/me"),
  updateMe: (data) => api.put("/auth/me", data),
  logout:   ()     => api.post("/auth/logout"),
};

/* ── Trades ────────────────────────────────────────────────────────── */
export const tradesAPI = {
  list:       (params) => api.get("/trades/", { params }),
  get:        (id)     => api.get(`/trades/${id}`),
  create:     (data)   => api.post("/trades/", data),
  update:     (id, data) => api.put(`/trades/${id}`, data),
  delete:     (id)     => api.delete(`/trades/${id}`),
  reanalyze:  (id)     => api.post(`/trades/${id}/reanalyze`),
  exportCsv:  ()       => api.get("/trades/export/csv", { responseType: "blob" }),
  uploadScreenshot: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/trades/upload-screenshot", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/* ── Analytics ─────────────────────────────────────────────────────── */
export const analyticsAPI = {
  full:        ()       => api.get("/analytics/"),
  summary:     ()       => api.get("/analytics/summary"),
  equityCurve: ()       => api.get("/analytics/equity-curve"),
  bySession:   ()       => api.get("/analytics/by-session"),
  byPair:      ()       => api.get("/analytics/by-pair"),
  behavior:    ()       => api.get("/analytics/behavior"),
  period:      (p)      => api.get("/analytics/period", { params: { period: p } }),
};

/* ── AI ────────────────────────────────────────────────────────────── */
export const aiAPI = {
  analyze:       (id) => api.post(`/ai/analyze/${id}`),
  feedback:      (id) => api.get(`/ai/feedback/${id}`),
  portfolio:     ()   => api.post("/ai/portfolio"),
  batchAnalyze:  (n)  => api.post(`/ai/batch?limit=${n || 10}`),
};

/* ── Strategy ──────────────────────────────────────────────────────── */
export const strategyAPI = {
  list:        ()         => api.get("/strategy/"),
  get:         (id)       => api.get(`/strategy/${id}`),
  create:      (data)     => api.post("/strategy/", data),
  update:      (id, data) => api.put(`/strategy/${id}`, data),
  delete:      (id)       => api.delete(`/strategy/${id}`),
  performance: (id)       => api.get(`/strategy/${id}/performance`),
  validate:    (id, data) => api.post(`/strategy/${id}/validate`, data),
};

/* ── Alerts ────────────────────────────────────────────────────────── */
export const alertsAPI = {
  list:              ()    => api.get("/alerts/"),
  create:            (d)   => api.post("/alerts/", d),
  toggle:            (id)  => api.put(`/alerts/${id}/toggle`),
  delete:            (id)  => api.delete(`/alerts/${id}`),
  checkConditions:   ()    => api.post("/alerts/check-conditions"),
};

export const adminAPI = {
  stats:  () => api.get("/admin/stats"),
  counts: () => api.get("/admin/counts"),
  users:  (params) => api.get("/admin/users", { params }),
  trades: (params) => api.get("/admin/trades", { params }),
};

export default api;
