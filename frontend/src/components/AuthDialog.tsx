import { FormEvent, useState, useEffect } from 'react';

interface AuthDialogProps {
  mode: 'login' | 'register';
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchMode: () => void;
  error?: string;
}

export const AuthDialog = ({ mode, open, onClose, onSubmit, onSwitchMode, error }: AuthDialogProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      // 关闭时重置表单
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLocalError('');
    }
  }, [open]);

  const title = mode === 'login' ? '登录账号' : '注册账号';
  const isRegister = mode === 'register';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // 注册时验证密码确认
    if (isRegister && password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    if (isRegister && password.length < 6) {
      setLocalError('密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password);
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '操作失败，请检查邮箱和密码';
      setLocalError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={onClose}
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {displayError && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 whitespace-pre-line">{displayError}</div>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? '至少6位' : '请输入密码'}
              minLength={isRegister ? 6 : undefined}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                确认密码
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 text-white font-semibold shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
          >
            {loading ? '处理中...' : title}
          </button>

          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            {isRegister ? (
              <>
                已有账号？{' '}
                <button
                  type="button"
                  onClick={onSwitchMode}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  立即登录
                </button>
              </>
            ) : (
              <>
                还没有账号？{' '}
                <button
                  type="button"
                  onClick={onSwitchMode}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  立即注册
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

