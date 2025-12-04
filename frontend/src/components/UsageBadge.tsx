import { useEffect } from 'react';

interface UsageBadgeProps {
  dailyUsed: number;
  dailyLimit: number;
  onLimitExceeded?: () => void;
}

export const UsageBadge = ({ dailyUsed, dailyLimit, onLimitExceeded }: UsageBadgeProps) => {
  const percent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));
  const remaining = Math.max(0, dailyLimit - dailyUsed);
  const isExceeded = dailyUsed >= dailyLimit;

  // 用量耗尽时触发回调
  useEffect(() => {
    if (isExceeded && onLimitExceeded) {
      onLimitExceeded();
    }
  }, [isExceeded, onLimitExceeded]);

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">今日免费额度</span>
        <span
          className={`text-sm font-semibold ${
            isExceeded
              ? 'text-red-600 dark:text-red-400'
              : remaining <= 10
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {dailyUsed}/{dailyLimit}
        </span>
      </div>

      {/* 进度条 */}
      <div className="mb-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isExceeded
              ? 'bg-red-500'
              : percent >= 80
              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-between text-xs">
        {isExceeded ? (
          <span className="text-red-600 dark:text-red-400 font-medium">今日额度已用完</span>
        ) : (
          <span className="text-slate-600 dark:text-slate-400">
            剩余 <span className="font-semibold text-slate-900 dark:text-white">{remaining}</span> 次
          </span>
        )}
        <span className="text-slate-500 dark:text-slate-400">每日 0 点重置</span>
      </div>

      {/* 用量耗尽提示 */}
      {isExceeded && (
        <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <div className="font-medium">今日免费额度已用完</div>
              <div className="mt-1 text-red-600 dark:text-red-400">请明天再来使用</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

