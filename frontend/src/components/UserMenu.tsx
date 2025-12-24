import { useState, useRef, useEffect } from 'react';

interface UserMenuProps {
  user: {
    email: string;
  };
  onLogout: () => void;
  onContactWeChat?: () => void;
  onFeedback?: () => void;
  onShowAdmin?: () => void;
}

export const UserMenu = ({ user, onLogout, onContactWeChat, onFeedback, onShowAdmin }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user.email.split('@')[0] || user.email;
  const avatarUrl = `https://api.dicebear.com/7.x/miniavs/svg?radius=50&seed=${encodeURIComponent(displayName)}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1">
          {onContactWeChat && (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition"
              onClick={() => {
                onContactWeChat();
                setOpen(false);
              }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 text-sm">
                💬
              </span>
              <span>联系哥们儿</span>
            </button>
          )}
          {onFeedback && (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() => {
                onFeedback();
                setOpen(false);
              }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-sm">
                💡
              </span>
              <span>用户反馈</span>
            </button>
          )}
          {/* 移除单独的查看反馈菜单项，合并到用户反馈中 */}
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 text-sm">
              ↩︎
            </span>
            <span>退出登录</span>
          </button>
        </div>
      )}
    </div>
  );
};


