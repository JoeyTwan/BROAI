import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface FeedbackItem {
  id: string;
  content: string;
  status: 'pending' | 'reviewed' | 'resolved';
  likes: number;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
}

interface FeedbackProps {
  isAuthenticated: boolean;
  user: { email?: string } | null;
}

export const Feedback = ({ isAuthenticated, user }: FeedbackProps) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // 加载用户信息和反馈列表
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 如果用户已登录，获取当前用户信息
        if (isAuthenticated) {
          try {
            const userInfoResponse = await api.get('/api/auth/me');
            if (userInfoResponse.data.user) {
              setUserEmail(userInfoResponse.data.user.email);
            }
          } catch (userErr) {
            // 获取用户信息失败不影响获取反馈列表
            console.error('获取用户信息失败:', userErr);
          }
        }

        // 获取反馈列表
        const feedbackResponse = await api.get('/api/feedback');
        if (feedbackResponse.data.success) {
          setFeedbackList(feedbackResponse.data.data.feedback || []);
        } else {
          throw new Error('获取反馈失败');
        }
      } catch (err: any) {
        console.error('加载数据失败:', err);
        setError('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // 提交反馈
  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('请输入反馈内容');
      return;
    }

    if (content.trim().length > 2000) {
      alert('反馈内容不能超过2000字');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/feedback', { content: content.trim() });
      setSuccess(true);
      setContent('');
      // 刷新反馈列表
      await refreshFeedback();
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 刷新反馈列表
  const refreshFeedback = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get('/api/feedback');
      if (data.success && data.data) {
        setFeedbackList(data.data.feedback || []);
      }
    } catch (err) {
      console.error('刷新反馈失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // 点赞反馈
  const handleLike = async (id: string) => {
    try {
      const { data } = await api.post(`/api/feedback/${id}/like`);
      if (data.success) {
        // 更新本地反馈列表的点赞数
        setFeedbackList(prev => prev.map(item => 
          item.id === id ? { ...item, likes: item.likes + 1 } : item
        ));
      }
    } catch (err) {
      console.error('点赞失败:', err);
      alert('点赞失败，请稍后重试');
    }
  };

  // 移除状态更新功能，根据用户需求不再需要

  // 删除反馈（仅管理员）
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条反馈吗？')) {
      try {
        await api.delete(`/api/feedback/${id}`);
        // 从本地列表中移除
        setFeedbackList(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        console.error('删除失败:', err);
        alert('删除失败，请稍后重试');
      }
    }
  };

  // 检查是否为管理员
  const isAdmin = (user?.email || userEmail) === 'joeytwan190190@163.com';

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'reviewed':
        return '已查看';
      case 'resolved':
        return '已解决';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 提交反馈区域 */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          用户反馈
        </h2>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 dark:text-green-400">反馈已提交！</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">感谢你的建议</p>
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请描述你遇到的问题或建议..."
              className="w-full h-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pr-20 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={300}
            />
            <div className="absolute bottom-3 right-4 flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={!isAuthenticated || submitting || !content.trim()}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-1.5 px-3 text-xs font-semibold text-white hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isAuthenticated ? '登录' : (submitting ? '提交中...' : '提交')}
              </button>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                {content.length}/300
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 反馈列表区域 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            所有反馈
          </h2>
          <button
            onClick={refreshFeedback}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
          >
            {refreshing ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            刷新
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            加载中...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            暂无反馈
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {getStatusText(item.status)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.userEmail}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words overflow-hidden">
                      {item.content}
                    </p>
                  </div>
                  
                  {/* 操作按钮区域 - 放在右侧 */}
                  <div className="flex flex-col items-center gap-1">
                    {/* 点赞按钮 */}
                    <button
                      onClick={() => handleLike(item.id)}
                      disabled={!isAuthenticated}
                      className="flex items-center gap-1 p-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{item.likes}</span>
                    </button>
                    
                    {/* 仅管理员显示删除按钮 */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1 p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>删除</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
