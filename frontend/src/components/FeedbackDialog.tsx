import { useState } from 'react';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

export const FeedbackDialog = ({ open, onClose, onSubmit }: FeedbackDialogProps) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await onSubmit(content.trim());
      setSuccess(true);
      setContent('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6 mx-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            用户反馈
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            你的建议对我们很重要
          </p>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">反馈已提交！</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">感谢你的建议</p>
          </div>
        ) : (
          <>
            {/* 输入框 */}
            <div className="mb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请描述你遇到的问题或建议..."
                className="w-full h-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                maxLength={2000}
              />
              <div className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
                {content.length}/2000
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '提交反馈'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

