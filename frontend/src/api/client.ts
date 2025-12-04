import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000'
});

// 请求拦截器：自动添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clarity-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理401错误（token过期）
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // token过期或无效，清除本地存储并触发登出
      localStorage.removeItem('clarity-token');
      // 触发自定义事件，让App组件处理登出
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

