import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

function ensureDeviceId(): string {
  let id = localStorage.getItem('bro-device-id') || '';
  if (!id) {
    const rand =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    id = `dev_${rand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)}`;
    localStorage.setItem('bro-device-id', id);
  }
  return id;
}

export function getDeviceId() {
  return ensureDeviceId();
}

export function getAdminToken() {
  return localStorage.getItem('bro-admin-token') || '';
}

export function setAdminToken(v: string) {
  if (v) localStorage.setItem('bro-admin-token', v);
  else localStorage.removeItem('bro-admin-token');
}

api.interceptors.request.use((config) => {
  config.headers['X-Device-Id'] = ensureDeviceId();
  const adminTk = getAdminToken();
  if (adminTk && config.url?.startsWith('/api/admin')) {
    config.headers['X-Admin-Token'] = adminTk;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // 现在没登录了，401 只作清理
    }
    return Promise.reject(err);
  }
);
