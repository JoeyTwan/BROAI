import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Feedback {
  id: string;
  content: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  updatedAt: string;
  userEmail: string;
}

export const FeedbackAdmin = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');

  const loadFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/feedback');
      if (data.success && data.data) {
        setFeedback(data.data.feedback || []);
      } else {
        throw new Error('获取反馈失败');
      }
    } catch (err: any) {
      console.error('加载反馈失败:', err);
      if (err.response?.status === 401) {
        setError('请先登录');
      } else {
        setError('加载反馈失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/feedback/${id}/status`, { status });
      await loadFeedback();
    } catch (err) {
      console.error('更新状态失败:', err);
      alert('更新状态失败');
    }
  };

  const filteredFeedback = filter === 'all' 
    ? feedback 
    : feedback.filter(f => f.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'reviewed', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {status === 'all' ? '全部' : getStatusText(status)}
            {status !== 'all' && (
              <span className="ml-2 text-xs">
                ({feedback.filter(f => f.status === status).length})
              </span>
            )}
          </button>
        ))}
        <button
          onClick={loadFeedback}
          className="ml-auto px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 反馈列表 */}
      <div className="space-y-3">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            暂无反馈
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.userEmail}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                {item.status !== 'reviewed' && (
                  <button
                    onClick={() => updateStatus(item.id, 'reviewed')}
                    className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    标记为已查看
                  </button>
                )}
                {item.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(item.id, 'resolved')}
                    className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    标记为已解决
                  </button>
                )}
                {item.status !== 'pending' && (
                  <button
                    onClick={() => updateStatus(item.id, 'pending')}
                    className="px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                  >
                    重置为待处理
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

