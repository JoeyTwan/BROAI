import { useEffect, useState } from 'react';

interface WeChatDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
}

export const WeChatDialog = ({ open, onClose, userId, userEmail }: WeChatDialogProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // 使用本地微信二维码图片
  useEffect(() => {
    if (open) {
      // 使用实际的微信二维码图片
      // 请将你的微信二维码图片放在 frontend/public/ 目录下
      // 支持的文件格式：.png, .jpg, .jpeg
      // 文件名可以是：wechat-qrcode.png 或 wechat-qrcode.jpg
      setQrCodeUrl('/wechat-qrcode.png');
    }
  }, [open]);

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
            哥们儿，加个微信呗
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            爱好者一起交流
          </p>
        </div>

        {/* 二维码 */}
        <div className="flex justify-center mb-6">
          {qrCodeUrl ? (
            <div className="relative">
              <img
                src={qrCodeUrl}
                alt="微信二维码"
                className="w-64 h-64 border-4 border-slate-200 dark:border-slate-700 rounded-xl"
                onError={(e) => {
                  // 如果图片加载失败，显示占位符
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-64 h-64 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700"><p class="text-slate-500 dark:text-slate-400 text-sm">请配置微信二维码</p></div>';
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm">加载中...</p>
            </div>
          )}
        </div>

        {/* 说明文字 */}
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p>扫码添加微信，一起交流学习</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-lg"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

