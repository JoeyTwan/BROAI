import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { api } from './api/client';
import { useAuth } from './hooks/useAuth';
import { Conversation, Message } from './types';
import { UsageBadge } from './components/UsageBadge';
import { AuthDialog } from './components/AuthDialog';
import { UserMenu } from './components/UserMenu';
import { WeChatDialog } from './components/WeChatDialog';
import { Feedback } from './components/Feedback';

const CLARIFICATION_PROMPT = `你是一个专业的需求澄清助手。当用户提出模糊需求时，必须严格遵守以下规则：

1. **每次只问一个问题**：绝对不要一次问多个问题，即使需要确认多个方面，也要一个一个来。每次回复只能包含一个问号（？）。

2. **提问顺序**：依次确认以下方面，每次只问一个：
   - 背景用途（这个需求的用途是什么？）
   - 目标受众（给谁看的？）
   - 格式与交付物（需要什么格式？）
   - 风格偏好（希望什么风格？）
   - 细节深度（需要多详细？）

3. **禁止行为**：
   - 禁止一次问多个问题（如"这个需求的用途是什么？给谁看的？"）
   - 禁止在信息不足时提前输出最终方案
   - 禁止使用"还有"、"另外"、"同时"等词引出多个问题

4. **完成条件**：当以上信息充分且用户明确表示"可以生成/开始"时，再一次性给出结构化结果。

5. **关于身份问题**：如果用户问"你是谁"、"你是什么"、"介绍一下自己"等身份相关问题，请回答："我是你哥们儿，不清楚需求不要紧，让哥们儿来帮你捋清楚。"

请严格遵守：每次回复只能问一个问题，用一句话表达。`;

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      if (typeof crypto.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        const segments = [
          Array.from(bytes.slice(0, 4), toHex).join(''),
          Array.from(bytes.slice(4, 6), toHex).join(''),
          Array.from(bytes.slice(6, 8), toHex).join(''),
          Array.from(bytes.slice(8, 10), toHex).join(''),
          Array.from(bytes.slice(10, 16), toHex).join('')
        ];
        return segments.join('-');
      }
    }
  } catch (error) {
    console.warn('UUID 生成失败，使用 fallback:', error);
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const summarizeTitle = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '新对话';
  return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized;
};

const createConversation = (title = '新对话'): Conversation => ({
  id: generateId(),
  title,
  createdAt: Date.now(),
  messages: []
});

// 处理文本中的 markdown 格式（加粗、斜体等）
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // 匹配 **加粗** 和 *斜体*
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, component: (match: string) => <strong key={`bold-${key++}`} className="font-semibold">{match}</strong> },
    { regex: /\*(.+?)\*/g, component: (match: string) => <em key={`italic-${key++}`} className="italic">{match}</em> },
  ];

  const matches: Array<{ index: number; length: number; component: React.ReactNode }> = [];

  patterns.forEach(({ regex, component }) => {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        component: component(match[1])
      });
    }
  });

  // 按位置排序
  matches.sort((a, b) => a.index - b.index);

  // 构建结果
  matches.forEach((match) => {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(match.component);
    lastIndex = match.index + match.length;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

// 格式化消息内容：处理换行、列表、markdown 等基本排版
const formatMessage = (content: string) => {
  // 处理换行和基本格式
  const lines = content.split('\n');
  const formatted: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // 空行
    if (!trimmed) {
      formatted.push(<br key={`br-${index}`} />);
      return;
    }
    
    // 分隔线（--- 或 ***）
    if (/^[-*]{3,}$/.test(trimmed)) {
      formatted.push(
        <hr key={`hr-${index}`} className="my-4 border-t border-slate-300" />
      );
      return;
    }
    
    // 标题（以 # 开头）
    if (/^#{1,6}\s/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,6})\s(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        formatted.push(
          <HeadingTag
            key={`heading-${index}`}
            className={clsx(
              'font-semibold text-slate-900 my-3',
              level === 1 && 'text-xl',
              level === 2 && 'text-lg',
              level >= 3 && 'text-base'
            )}
          >
            {parseInlineMarkdown(text)}
          </HeadingTag>
        );
        return;
      }
    }
    
    // 列表项（以 - 或 * 开头，但不是分隔线）
    if (/^[-*]\s/.test(trimmed) && !/^[-*]{3,}$/.test(trimmed)) {
      const listContent = trimmed.replace(/^[-*]\s/, '');
      formatted.push(
        <div key={`line-${index}`} className="flex items-start gap-2 my-1.5">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">•</span>
          <span className="flex-1">{parseInlineMarkdown(listContent)}</span>
        </div>
      );
      return;
    }
    
    // 数字列表（以数字开头）
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.+)$/);
      if (match) {
        formatted.push(
          <div key={`line-${index}`} className="flex items-start gap-2 my-1.5">
            <span className="text-slate-500 mt-0.5 font-medium flex-shrink-0">{match[1]}.</span>
            <span className="flex-1">{parseInlineMarkdown(match[2])}</span>
          </div>
        );
        return;
      }
    }
    
    // 普通文本段落
    formatted.push(
      <div key={`line-${index}`} className="my-1.5 leading-relaxed">
        {parseInlineMarkdown(trimmed)}
      </div>
    );
  });
  
  return formatted;
};

const App = () => {
  const { user, usage, loading, error, isAuthenticated, login, register, logout, fetchUsage } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [weChatOpen, setWeChatOpen] = useState(false);
  const [hasShownWeChatPrompt, setHasShownWeChatPrompt] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isRestoringConversations, setIsRestoringConversations] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const activeConversation = useMemo(
    () => currentId ? conversations.find((c) => c.id === currentId) : null,
    [conversations, currentId]
  );

  // 用于自动滚动的ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  // 用于输入框的ref
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部（使用 requestAnimationFrame 优化性能）
  useEffect(() => {
    if (messagesEndRef.current && activeConversation?.messages.length) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [activeConversation?.messages.length, sending]);

  // 从后端加载对话列表
  const loadConversationsFromBackend = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    try {
      console.log('[对话加载] 从后端加载对话列表，用户ID:', user.id);
      const { data } = await api.get('/api/conversations');
      
      if (data.success && Array.isArray(data.data)) {
        const loadedConversations = data.data;
        console.log('[对话加载] ✅ 成功加载', loadedConversations.length, '个对话');
        
        if (loadedConversations.length > 0) {
          setConversations(loadedConversations);
          setCurrentId(loadedConversations[0].id);
        } else {
          // 如果没有对话，不创建空对话，显示欢迎界面
          setConversations([]);
          setCurrentId('');
        }
      } else {
        throw new Error('返回数据格式错误');
      }
    } catch (error: any) {
      console.error('[对话加载] ❌ 加载失败:', error);
      // 如果加载失败，不创建空会话，显示欢迎界面
      setConversations([]);
      setCurrentId('');
    }
  }, [isAuthenticated, user?.id]);

  // 同步对话到后端（防抖处理，只在必要时同步）
  const syncConversationsToBackend = useCallback(async (force = false) => {
    if (!isAuthenticated || !user?.id || isRestoringConversations || isDeletingConversation) return;
    
    // 只在有对话且不是强制同步时才同步（避免空数组同步）
    if (!force && conversations.length === 0) return;
    
    try {
      console.log('[对话同步] 同步对话到后端，数量:', conversations.length);
      await api.post('/api/conversations/sync', { conversations });
      console.log('[对话同步] ✅ 同步成功');
    } catch (error: any) {
      console.error('[对话同步] ❌ 同步失败:', error);
      // 同步失败不影响用户体验，只记录错误
    }
  }, [conversations, isAuthenticated, user?.id, isRestoringConversations, isDeletingConversation]);

  // 登录时从后端加载对话，退出登录时清空会话列表
  useEffect(() => {
    if (!isAuthenticated) {
      // 用户退出登录，清空所有会话，显示欢迎界面
      setConversations([]);
      setCurrentId('');
      setInput('');
      setHasShownWeChatPrompt(false);
      setWeChatOpen(false);
      setLimitExceeded(false);
      setIsRestoringConversations(false);
    } else if (isAuthenticated && user?.id && !loading) {
      // 用户登录且加载完成，从后端加载对话
      setIsRestoringConversations(true);
      loadConversationsFromBackend().finally(() => {
        setTimeout(() => setIsRestoringConversations(false), 200);
      });
    }
  }, [isAuthenticated, user?.id, loading, loadConversationsFromBackend]);

  // 对话变化时同步到后端（使用防抖，只在消息变化时同步）
  // 注意：重命名、置顶等操作已经单独处理，这里主要处理消息变化
  useEffect(() => {
    if (isAuthenticated && user?.id && !isRestoringConversations && !isDeletingConversation && conversations.length > 0) {
      // 检查是否有对话包含消息（只有消息变化才需要同步）
      const hasMessages = conversations.some(conv => conv.messages && conv.messages.length > 0);
      if (!hasMessages) return; // 没有消息的对话不需要同步
      
      const timer = setTimeout(() => {
        syncConversationsToBackend();
      }, 2000); // 增加到2秒防抖，减少同步频率
      
      return () => clearTimeout(timer);
    }
  }, [conversations, isAuthenticated, user?.id, isRestoringConversations, isDeletingConversation, syncConversationsToBackend]);

  const handleNewConversation = () => {
    // 点击"开启新对话"后，清空当前对话，回到首页（不创建新对话）
    // 只有当用户真正发送第一条消息时，才会创建新对话
    setCurrentId('');
    setInput('');
  };

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    // 更新本地状态
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, title: newTitle.trim() } : conv))
    );
    setEditingId(null);
    setEditingTitle('');
    
    // 同步到后端
    if (isAuthenticated) {
      try {
        await api.put(`/api/conversations/${id}`, { title: newTitle.trim() });
      } catch (error) {
        console.error('更新对话标题失败:', error);
      }
    }
  };

  const handlePin = async (id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (!conversation) return;
    
    const newPinned = !conversation.pinned;
    
    // 更新本地状态
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, pinned: newPinned } : conv))
    );
    
    // 同步到后端
    if (isAuthenticated) {
      try {
        await api.put(`/api/conversations/${id}`, { pinned: newPinned });
      } catch (error) {
        console.error('更新对话置顶状态失败:', error);
      }
    }
  };

  // 处理反馈提交（移到Feedback组件内部处理）

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个对话吗？')) return;
    
    setIsDeletingConversation(true);
    
    // 先从后端删除（确保删除成功）
    if (isAuthenticated) {
      try {
        const response = await api.delete(`/api/conversations/${id}`);
        if (!response.data.success) {
          throw new Error('删除失败');
        }
      } catch (error) {
        console.error('删除对话失败:', error);
        alert('删除失败，请重试');
        setIsDeletingConversation(false);
        // 如果删除失败，重新加载对话列表以恢复状态
        loadConversationsFromBackend();
        return;
      }
    }
    
    // 删除成功后，更新本地状态
    setConversations((prev) => {
      const filtered = prev.filter((conv) => conv.id !== id);
      // 如果删除的是当前对话，切换到第一个对话
      if (id === currentId && filtered.length > 0) {
        setCurrentId(filtered[0].id);
      } else if (filtered.length === 0) {
        // 如果删除后没有对话了，清空当前对话ID，显示欢迎界面
        setCurrentId('');
        return [];
      }
      return filtered;
    });
    
    // 延迟重置标志，避免同步逻辑触发
    setTimeout(() => {
      setIsDeletingConversation(false);
    }, 2000);
  };

  // 排序：置顶的在前，然后按创建时间倒序
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [conversations]);

  const appendMessage = (conversationId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title:
                conversation.messages.length === 0 && message.role === 'user'
                  ? summarizeTitle(message.content)
                  : conversation.title,
              messages: [...conversation.messages, message]
            }
          : conversation
      )
    );
    // 消息添加后，延迟同步到后端（不立即同步，等待防抖）
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 如果没有当前对话或当前对话是空的，创建新对话
    let conversationToUse = activeConversation;
    if (!conversationToUse || conversationToUse.messages.length === 0) {
      const newConv = createConversation();
      setConversations((prev) => [newConv, ...prev]);
      setCurrentId(newConv.id);
      conversationToUse = newConv;
      
      // 同步到后端
      if (isAuthenticated) {
        try {
          await api.post('/api/conversations', { title: newConv.title, id: newConv.id });
        } catch (error) {
          console.error('创建对话失败:', error);
        }
      }
    }
    
    const historyBeforeSend = conversationToUse.messages;

    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }

    if (usage.dailyUsed >= usage.limit) {
      setLimitExceeded(true);
      return;
    }

    const userMessage: Message = { role: 'user', content: input.trim() };
    appendMessage(conversationToUse.id, userMessage);
    setInput('');
    setLimitExceeded(false);

    setSending(true);
    try {
      const payloadMessages = [
        { role: 'system', content: CLARIFICATION_PROMPT },
        ...historyBeforeSend,
        userMessage
      ].map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      const { data } = await api.post('/api/ai/chat', { messages: payloadMessages });

      if (data.success && data.data) {
        appendMessage(conversationToUse.id, { role: 'assistant', content: data.data });
        if (data.usage) {
          await fetchUsage();
          // 检查是否使用了5次，如果是则弹出微信对话框（只弹出一次）
          const newUsage = data.usage.used_today || usage.dailyUsed + 1;
          if (newUsage >= 5 && !hasShownWeChatPrompt) {
            setHasShownWeChatPrompt(true);
            setWeChatOpen(true);
          }
        }
        // AI回复后，同步对话到后端（延迟同步，避免阻塞）
        setTimeout(() => {
          syncConversationsToBackend(true);
        }, 500);
      } else {
        throw new Error(data.message || 'AI服务返回异常');
      }
    } catch (err: any) {
      console.error('发送消息失败:', err);

      if (err.response?.status === 429) {
        const errorData = err.response.data;
        setLimitExceeded(true);
        appendMessage(conversationToUse.id, {
          role: 'assistant',
          content: `⚠️ ${errorData.message || '今日免费额度已用完，请明天再来'}`
        });
        fetchUsage();
      } else {
        appendMessage(conversationToUse.id, {
          role: 'assistant',
          content: '❌ AI 服务暂不可用，请稍后重试。'
        });
      }
    } finally {
      setSending(false);
      // AI回答完成后，自动将焦点设置回输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleLimitExceeded = () => {
    setLimitExceeded(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const showWelcomeView = !currentId || !activeConversation || activeConversation.messages.length === 0;

  return (
    <div className="flex h-screen bg-white">
      <aside className="hidden w-80 flex flex-col border-r border-slate-200 bg-slate-50 lg:flex">
        <div className="px-6 pt-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 overflow-hidden">
              {/* 背景装饰 */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-8 h-8 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
              </div>
              {/* Bro文字 */}
              <div className="relative z-10 font-bold text-white text-base tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}>
                Bro
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">BroAI</p>
              <p className="text-sm font-medium text-slate-700 italic">遇事儿别慌，哥们儿来帮</p>
            </div>
          </div>
          <button
            onClick={handleNewConversation}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
          >
            <span className="text-xl">＋</span> 开启新对话
          </button>
        </div>

        <div className="mt-8 flex-1 space-y-2 overflow-y-auto px-6">
          {sortedConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="relative group"
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {editingId === conversation.id ? (
                <div className="h-16 w-full rounded-2xl border border-blue-300 bg-white px-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(conversation.id, editingTitle);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditingTitle('');
                      }
                    }}
                    onBlur={() => {
                      if (editingTitle.trim()) {
                        handleRename(conversation.id, editingTitle);
                      } else {
                        setEditingId(null);
                        setEditingTitle('');
                      }
                    }}
                    className="flex-1 text-sm font-medium text-slate-900 bg-transparent border-0 outline-none focus:ring-0"
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  className={clsx(
                    'h-16 w-full rounded-2xl border border-slate-200 px-4 flex items-center gap-2 transition',
                    conversation.id === currentId && 'bg-blue-50 border-blue-200',
                    hoveredId === conversation.id && 'bg-slate-100'
                  )}
                >
                  <button
                    onClick={() => setCurrentId(conversation.id)}
                    className="flex-1 text-left text-sm font-medium text-slate-700 h-full flex items-center"
                  >
                    <span className="line-clamp-2 flex items-center gap-2">
                      {conversation.pinned && (
                        <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                      {conversation.title}
                    </span>
                  </button>
                  {hoveredId === conversation.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(conversation.id);
                          setEditingTitle(conversation.title);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition"
                        title="重命名"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePin(conversation.id);
                        }}
                        className={clsx(
                          'p-1.5 rounded-lg hover:bg-slate-200 transition',
                          conversation.pinned ? 'text-blue-600' : 'text-slate-600'
                        )}
                        title={conversation.pinned ? '取消置顶' : '置顶'}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conversation.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition"
                        title="删除"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部用户信息和用量 */}
        <div className="border-t border-slate-200 px-6 py-4 flex-shrink-0">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>今日额度</span>
                <span className={clsx(
                  'font-semibold',
                  usage.dailyUsed >= usage.limit ? 'text-red-600' : 'text-blue-600'
                )}>
                  {usage.dailyUsed}/{usage.limit}
                </span>
              </div>
            <UserMenu 
              user={user} 
              onLogout={logout} 
              onContactWeChat={() => setWeChatOpen(true)}
              onFeedback={() => setShowFeedback(true)}
            />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">今日额度 0/100</div>
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                登录后可同步会话、查看额度
                <div className="mt-4 flex gap-2">
                  <button
                    className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthOpen(true);
                    }}
                  >
                    登录
                  </button>
                  <button
                    className="flex-1 rounded-xl border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthOpen(true);
                    }}
                  >
                    注册
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-white">
        {/* 内容区域 */}
        {showWelcomeView ? (
          // 首页输入界面
          <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20">
            <div className="w-full max-w-3xl">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400 mb-4">BroAI · 多轮澄清</p>
              <h1 className="text-4xl font-semibold text-slate-900 mb-3">把模糊需求甩过来，让哥们儿帮你捋清楚。</h1>
              <p className="text-base text-slate-500 mb-12 max-w-2xl" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>
                
              </p>

              {/* 引导文字点击条 */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => setInput('给我来一个产品介绍文案')}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
                >
                  给我来一个产品介绍文案
                </button>
                <button
                  onClick={() => setInput('给我整一个市场调研方案')}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
                >
                  给我整一个市场调研方案
                </button>
                <button
                  onClick={() => setInput('给我弄一个旅游攻略')}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
                >
                  给我弄一个旅游攻略
                </button>
              </div>

              {/* 输入区域 */}
              <div className="space-y-4">
                <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={input}
                    disabled={sending || !isAuthenticated || limitExceeded || usage.dailyUsed >= usage.limit}
                    onKeyDown={handleKeyDown}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      !isAuthenticated
                        ? '请先登录以使用AI功能'
                        : limitExceeded || usage.dailyUsed >= usage.limit
                        ? '今日额度已用完，请明天再来'
                        : '给哥们儿说说心里话...'
                    }
                    className="w-full resize-none rounded-2xl border-0 bg-transparent px-5 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    rows={4}
                  />
                  <div className="flex items-center justify-end border-t border-slate-100 px-4 py-3">
                    <button
                      disabled={sending || !isAuthenticated || limitExceeded || usage.dailyUsed >= usage.limit || !input.trim()}
                      onClick={handleSend}
                      className="h-10 w-10 rounded-lg bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                      title={!isAuthenticated ? '请先登录' : limitExceeded || usage.dailyUsed >= usage.limit ? '今日额度已用完' : '发送消息'}
                    >
                      {sending ? (
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    登录后才可以发起澄清，
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setAuthOpen(true);
                      }}
                      className="ml-1 font-semibold underline hover:text-blue-800"
                    >
                      立即登录
                    </button>
                  </div>
                )}
                {isAuthenticated && (limitExceeded || usage.dailyUsed >= usage.limit) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    今日免费额度已用完，请明天再来
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 有消息时的聊天界面
          <>
            <section ref={chatSectionRef} className="flex-1 overflow-y-auto px-8 py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {activeConversation?.messages.map((message, index) => {
                  const messageId = `${message.role}-${index}`;
                  return (
                    <div
                      key={messageId}
                      className={clsx('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}
                    >
                      <div
                        className={clsx(
                          'max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm whitespace-pre-wrap relative group',
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900 border border-slate-200'
                        )}
                      >
                        {message.role === 'assistant' ? formatMessage(message.content) : message.content}
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(message.content, messageId)}
                            className={clsx(
                              'absolute top-2 right-2 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100',
                              'bg-white/90 hover:bg-white text-slate-700 shadow-sm',
                              copiedMessageId === messageId && 'opacity-100 bg-green-100 text-green-700'
                            )}
                            title={copiedMessageId === messageId ? '已复制' : '复制'}
                          >
                            {copiedMessageId === messageId ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* AI正在思考的动效 */}
                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-2xl rounded-2xl px-5 py-4 text-sm bg-slate-100 text-slate-900 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-slate-500 text-xs">哥们儿正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </section>

            <footer className="border-t border-slate-200 px-8 py-4">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {!isAuthenticated && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    登录后才可以发起澄清，点左下角账号区或这里的按钮完成登录。
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setAuthOpen(true);
                      }}
                      className="ml-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      立即登录
                    </button>
                  </div>
                )}
                {isAuthenticated && (limitExceeded || usage.dailyUsed >= usage.limit) && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    今日免费额度已用完，请明天再来
                  </div>
                )}
                <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={input}
                    disabled={sending || !isAuthenticated || limitExceeded || usage.dailyUsed >= usage.limit}
                    onKeyDown={handleKeyDown}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      !isAuthenticated
                        ? '请先登录以使用AI功能'
                        : limitExceeded || usage.dailyUsed >= usage.limit
                        ? '今日额度已用完，请明天再来'
                        : '给哥们儿说说心里话。。。'
                    }
                    className="flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    rows={2}
                  />
                  <button
                    disabled={sending || !isAuthenticated || limitExceeded || usage.dailyUsed >= usage.limit || !input.trim()}
                    onClick={handleSend}
                    className="h-10 w-10 rounded-lg bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                    title={!isAuthenticated ? '请先登录' : limitExceeded || usage.dailyUsed >= usage.limit ? '今日额度已用完' : '发送消息'}
                  >
                    {sending ? (
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </main>

      <AuthDialog
        mode={authMode}
        open={authOpen && !loading}
        onClose={() => {
          setAuthOpen(false);
        }}
        onSubmit={authMode === 'login' ? login : register}
        onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        error={error}
      />

        <WeChatDialog
        open={weChatOpen}
        onClose={() => setWeChatOpen(false)}
      />
        {showFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowFeedback(false)}
            ></div>
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl p-8">
              <button
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setShowFeedback(false)}
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Feedback isAuthenticated={isAuthenticated} user={user} />
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
