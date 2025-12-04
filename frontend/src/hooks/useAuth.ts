import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export interface UsageInfo {
  dailyUsed: number;
  remaining: number;
  totalUsed: number;
  limit: number;
  resetTime?: string;
}

export interface UserInfo {
  id: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo>({
    dailyUsed: 0,
    remaining: 100,
    totalUsed: 0,
    limit: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
      setError('');
    } catch (err: any) {
      setUser(null);
      if (err.response?.status !== 401) {
        // 401是正常的未登录状态，不显示错误
        setError('获取用户信息失败');
      }
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const { data } = await api.get('/api/usage/current');
      if (data.success && data.usage) {
        setUsage({
          dailyUsed: data.usage.used_today || 0,
          remaining: data.usage.remaining_today || 0,
          totalUsed: data.usage.total_used || 0,
          limit: data.usage.limit || 100,
          resetTime: data.usage.reset_time
        });
      }
      setError('');
    } catch (err: any) {
      console.error('获取用量失败:', err);
      // 用量获取失败不影响使用，只记录错误
      if (err.response?.status !== 401) {
        setError('获取用量信息失败');
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('clarity-token', data.token);
      setUser(data.user);
      setError('');
      await fetchUsage();
    } catch (err: any) {
      console.error('登录错误详情:', err);
      
      // 网络错误（无法连接到服务器）
      if (!err.response) {
        const message = `无法连接到服务器，请检查：\n1. 后端服务是否运行（http://localhost:4000）\n2. VITE_API_URL 配置是否正确\n3. 网络连接是否正常`;
        setError(message);
        throw new Error(message);
      }
      
      // HTTP错误响应
      const status = err.response?.status;
      let message = '登录失败';
      
      if (status === 401) {
        message = '邮箱或密码错误，请检查后重试';
      } else if (status === 400) {
        message = err.response?.data?.message || '邮箱和密码不能为空';
      } else if (status === 500) {
        message = '服务器错误，请稍后重试';
      } else {
        message = err.response?.data?.message || `登录失败 (错误代码: ${status})`;
      }
      
      setError(message);
      throw err;
    }
  }, [fetchUsage]);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post('/api/auth/register', { email, password });
      localStorage.setItem('clarity-token', data.token);
      setUser(data.user);
      setError('');
      await fetchUsage();
    } catch (err: any) {
      console.error('注册错误详情:', err);
      
      // 网络错误（无法连接到服务器）
      if (!err.response) {
        const message = `无法连接到服务器，请检查：\n1. 后端服务是否运行（http://localhost:4000）\n2. VITE_API_URL 配置是否正确\n3. 网络连接是否正常`;
        setError(message);
        throw new Error(message);
      }
      
      // HTTP错误响应
      const status = err.response?.status;
      let message = '注册失败';
      
      if (status === 409) {
        message = '该邮箱已被注册，请使用其他邮箱或直接登录';
      } else if (status === 400) {
        message = err.response?.data?.message || '邮箱和密码不能为空';
      } else if (status === 500) {
        message = '服务器错误，请稍后重试';
      } else {
        message = err.response?.data?.message || `注册失败 (错误代码: ${status})`;
      }
      
      setError(message);
      throw err;
    }
  }, [fetchUsage]);

  const logout = useCallback(() => {
    localStorage.removeItem('clarity-token');
    setUser(null);
    setUsage({
      dailyUsed: 0,
      remaining: 100,
      totalUsed: 0,
      limit: 100
    });
    setError('');
  }, []);

  // 初始化：检查token并加载用户信息
  useEffect(() => {
    const token = localStorage.getItem('clarity-token');
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      await fetchMe();
      await fetchUsage();
      setLoading(false);
    })();
  }, [fetchMe, fetchUsage]);

  // 监听登出事件（由API拦截器触发）
  useEffect(() => {
    const handleLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [logout]);

  return {
    user,
    usage,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    fetchUsage,
    fetchMe
  };
};

