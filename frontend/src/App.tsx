import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/client';
import type { Conversation, Message } from './types';
import ScenePicker from './components/ScenePicker';
import CardSwitch from './components/CardSwitch';
import useSpeech from './hooks/useSpeech';
import clsx from 'clsx';

function useMe() {
  const [nickname, setNickname] = useState('朋友');
  const [nickEditing, setNickEditing] = useState(false);
  const [nickInput, setNickInput] = useState('');
  async function load() {
    try {
      const { data } = await api.get('/api/auth/me');
      setNickname(data.user?.nickname || '朋友');
    } catch {}
  }
  async function save() {
    const v = nickInput.trim() || nickname;
    try {
      await api.post('/api/auth/nickname', { nickname: v });
      setNickname(v);
    } catch {}
    setNickEditing(false);
  }
  useEffect(() => { load(); }, []);
  return { nickname, nickEditing, setNickEditing, nickInput, setNickInput, save };
}

export default function App() {
  const me = useMe();
  const { supported: micSupported, listening, speaking, start, stop, speak, stopSpeak } = useSpeech();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [pendingClarify, setPendingClarify] = useState<{
    conversation_id: string;
    clarification_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupReady, setSetupReady] = useState<boolean | null>(null);
  const [transientText, setTransientText] = useState('');

  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/health');
        setSetupReady(!!data.setupReady);
      } catch { setSetupReady(false); }
      try {
        const { data } = await api.get('/api/chat/conversations');
        const list: Conversation[] = (data.conversations || []).map((c: any) => ({
          id: c.id, title: c.title || '新会话', scene: c.scene, createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
          messages: []
        }));
        setConversations(list);
        if (!activeId && list[0]) {
          setActiveId(list[0].id);
          loadMessages(list[0].id);
        } else if (activeId) {
          loadMessages(activeId);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' });
  }, [active?.messages.length, loading, transientText]);

  async function loadMessages(id: string) {
    try {
      const { data } = await api.get(`/api/chat/conversations/${id}/messages`);
      const msgs: Message[] = (data.messages || []).map((m: any) => {
        const role = m.role as Message['role'];
        let card: any = null;
        try { if (m.metadata?.card) card = typeof m.metadata.card === 'string' ? JSON.parse(m.metadata.card) : m.metadata.card; } catch {}
        return { role, content: m.content || '', card };
      });
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages: msgs } : c)));
    } catch {}
  }

  function newConversation() {
    setActiveId('');
    setConversations((prev) => [{ id: '', title: '新会话', messages: [] }, ...prev]);
    setInput('');
    setError('');
  }

  function sendSceneStart(sceneKey: string, defaultQuestion: string) {
    if (activeId) {
      // 切一个新会话更清爽
    }
    setActiveId('');
    setConversations((prev) => [
      { id: '', title: '新会话', scene: sceneKey, messages: [] },
      ...prev
    ]);
    setInput(defaultQuestion);
    setTimeout(() => submit(defaultQuestion, sceneKey), 0);
  }

  async function submit(overrideText?: string, sceneHint?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setTransientText('');
    setLoading(true);
    setError('');
    try {
      const body: any = {
        message: text,
        pending_clarification: pendingClarify,
        scene_hint: sceneHint || active?.scene || undefined
      };
      if (activeId) body.conversation_id = activeId;

      const { data } = await api.post('/api/ai/chat', body);
      setPendingClarify(data.pending_clarification || null);
      const assistantCard = data.card || null;
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || '',
        card: assistantCard
      };
      const userMsg: Message = { role: 'user', content: text };

      const convId: string = data.conversation_id;
      const title: string = data.title || active?.title || '新会话';

      setConversations((prev) => {
        let list = prev.slice();
        const idx = list.findIndex((c) => c.id === convId);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            title,
            id: convId,
            scene: data.scene || list[idx].scene,
            messages: [...list[idx].messages, userMsg, assistantMsg]
          };
        } else {
          list.unshift({
            id: convId,
            title,
            scene: data.scene || sceneHint,
            createdAt: Date.now(),
            messages: [userMsg, assistantMsg]
          });
        }
        // 清掉空 id 占位
        list = list.filter((c, i) => c.id || i === list.length + 1);
        return list;
      });
      setActiveId(convId);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || '出了点小问题，稍后再试试。';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function startMic() {
    if (listening) { stop(); return; }
    start({
      onChange: (t, isFinal) => setTransientText(isFinal ? '' : t),
      onFinal: (t) => {
        setTransientText('');
        if (t) setInput((s) => (s ? s + '，' + t : t));
      }
    });
  }

  function speakActiveLast() {
    if (!active?.messages.length) return;
    for (let i = active.messages.length - 1; i >= 0; i--) {
      const m = active.messages[i];
      if (m.role === 'assistant') { speak(m.content || ''); break; }
    }
  }

  const showScenes = !active || active.messages.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/40 border-b border-slate-800/70">
        <div className="mx-auto max-w-6xl px-4 md:px-8 h-16 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl scene-gradient-travel flex items-center justify-center font-bold text-white shadow-lg">
            省
          </div>
          <div className="flex-1">
            <div className="font-semibold leading-tight">省心聊</div>
            <div className="text-[11px] text-slate-400 leading-tight">想到啥就说啥，聊清楚，办明白</div>
          </div>

          {setupReady === false && (
            <a href="/admin" className="bro-btn rounded-xl px-3 py-1.5 text-sm bg-rose-500/15 border border-rose-500/30 text-rose-200">
              ⚠️ 尚未配置 API，点这里去设置
            </a>
          )}

          {/* 昵称 */}
          <div className="hidden md:flex items-center gap-2">
            {me.nickEditing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={me.nickInput || me.nickname}
                  onChange={(e) => me.setNickInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') me.save(); }}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 w-28 text-sm outline-none focus:border-sky-500"
                />
                <button onClick={me.save} className="bro-btn rounded-lg px-2 py-1 bg-sky-500/20 text-sky-200 text-xs">保存</button>
              </div>
            ) : (
              <button
                onClick={() => { me.setNickInput(me.nickname); me.setNickEditing(true); }}
                className="text-sm text-slate-300 hover:text-white"
              >
                嘿，<span className="text-sky-300 font-semibold">{me.nickname}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主体：侧栏 + 聊天 */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 md:px-8 py-5 grid grid-cols-12 gap-5">
        {/* 侧栏 */}
        <aside className="col-span-12 md:col-span-3 order-2 md:order-1">
          <button
            onClick={newConversation}
            className="bro-btn w-full rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-semibold py-3 shadow-lg shadow-sky-900/40"
          >
            ＋ 新的一次聊天
          </button>
          <div className="mt-4 bro-card rounded-2xl p-2 max-h-[55vh] md:max-h-[72vh] overflow-auto scrollbar-thin">
            {conversations.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">
                还没记录。选一个场景就自动建好了。
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id || '__new__'}
                  onClick={() => { setActiveId(c.id); if (c.id) loadMessages(c.id); }}
                  className={clsx(
                    'w-full text-left rounded-xl px-3 py-2.5 mb-1 text-sm',
                    c.id === activeId ? 'bg-sky-500/15 border border-sky-500/30' : 'hover:bg-slate-700/30'
                  )}
                >
                  <div className="font-medium truncate">{c.title || '新会话'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {c.scene ? sceneLabel(c.scene) : '随便聊'}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500 hidden md:block">
            <a className="hover:text-slate-300" href="/qrcode">📱 扫码入口</a>
            <span className="mx-2">·</span>
            <a className="hover:text-slate-300" href="/admin">🔧 管理员</a>
          </div>
        </aside>

        {/* 聊天区 */}
        <section className="col-span-12 md:col-span-9 order-1 md:order-2 flex flex-col">
          <div
            ref={scrollerRef}
            className="bro-card rounded-3xl flex-1 p-4 md:p-6 overflow-auto scrollbar-thin min-h-[55vh] md:min-h-[68vh]"
          >
            {showScenes && !active?.messages.length && (
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                    想让我帮你做点啥？
                  </div>
                  <div className="text-slate-400 mt-2 text-sm md:text-base">
                    你说不清楚没关系，我会一步一步问你。
                  </div>
                </div>
                <ScenePicker onPick={sendSceneStart} disabled={!setupReady} />

                <div className="mt-8 bro-card rounded-2xl p-4 md:p-5">
                  <div className="text-sm font-medium mb-3 text-slate-300">也可以直接点下面，我替你开个头：</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '周末想带孙子去趟近郊，推荐点地方呗',
                      '我冰箱里有鸡蛋、西红柿、青椒，能做啥',
                      '给我女儿发段话，让她别总熬夜'
                    ].map((t, i) => (
                      <button
                        key={i}
                        onClick={() => submit(t)}
                        disabled={!setupReady}
                        className="bro-btn rounded-full px-4 py-2 text-sm border border-slate-700 hover:border-sky-500/60 bg-slate-900/40"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto space-y-4 mt-4">
              {(active?.messages || []).map((m, idx) => (
                <MsgBubble key={idx} m={m} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <Avatar role="assistant" />
                  <div className="bro-card rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="bro-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 输入区 */}
          <div className="mt-4 bro-card rounded-3xl p-3 md:p-4">
            <div className="flex items-end gap-2">
              {micSupported && (
                <button
                  onClick={startMic}
                  className={clsx(
                    'bro-btn shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center text-xl',
                    listening ? 'bg-rose-500 text-white bro-mic-pulse' : 'bg-slate-700 hover:bg-slate-600'
                  )}
                  title={listening ? '正在录音，点我停止' : '按住/点我说话'}
                >
                  🎙️
                </button>
              )}
              <div className="flex-1 relative">
                <textarea
                  value={input + (transientText ? (input ? '，' : '') + transientText : '')}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder={
                    pendingClarify
                      ? '你就答我这一个问题，不用多说～（回车发送）'
                      : '想到啥说啥，说不清楚也没关系，我会问你。'
                  }
                  className="w-full resize-none rounded-2xl bg-slate-900/60 border border-slate-700 px-4 py-3 outline-none focus:border-sky-500 text-[16px]"
                  style={{ minHeight: 52, maxHeight: 220 }}
                />
              </div>
              {speaking ? (
                <button onClick={stopSpeak} className="bro-btn shrink-0 h-12 px-4 md:h-14 rounded-2xl bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  🔊 停
                </button>
              ) : (
                <button
                  onClick={speakActiveLast}
                  disabled={!active?.messages.length}
                  className="bro-btn shrink-0 h-12 px-4 md:h-14 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                  title="念出最后一条回复"
                >
                  🔊
                </button>
              )}
              <button
                onClick={() => submit()}
                disabled={!input.trim() || loading}
                className="bro-btn shrink-0 h-12 px-5 md:h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 font-semibold"
              >
                发送
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 px-1 flex flex-wrap gap-x-4 gap-y-1">
              {pendingClarify ? (
                <>⏳ 上一个问题还在等你回答，先答它就行。</>
              ) : (
                <>
                  <span>💡 提示：不用一次说清楚，我会一步一步问你。</span>
                  <span className="md:ml-auto">回车发送 · Shift+回车换行</span>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-slate-600 py-5 px-4">
        省心聊 · 想到啥就说啥，聊清楚，办明白
      </footer>
    </div>
  );
}

function sceneLabel(s: string) {
  if (s === 'travel') return '✈️ 做行程';
  if (s === 'recipe') return '🍲 做菜谱';
  if (s === 'letter') return '💌 写封信';
  return '随便聊';
}

function Avatar({ role }: { role: Message['role'] }) {
  if (role === 'system') return null;
  if (role === 'assistant') {
    return (
      <div className="h-9 w-9 shrink-0 rounded-2xl scene-gradient-travel flex items-center justify-center text-white text-sm font-bold shadow-md">
        省
      </div>
    );
  }
  return (
    <div className="h-9 w-9 shrink-0 rounded-2xl bg-slate-700 flex items-center justify-center text-sm">
      👵
    </div>
  );
}

function MsgBubble({ m }: { m: Message }) {
  if (m.role === 'system') return null;
  const isUser = m.role === 'user';
  const hasCard = !isUser && !!m.card;
  return (
    <div className={clsx('flex items-start gap-3', isUser ? 'flex-row-reverse' : '')}>
      <Avatar role={m.role} />
      <div className={clsx('max-w-[88%]', isUser ? 'items-end' : 'items-start')}>
        {!hasCard && (
          <div
            className={clsx(
              'rounded-2xl px-4 py-3 whitespace-pre-wrap leading-7 text-[15.5px]',
              isUser
                ? 'bg-sky-500/90 text-white rounded-tr-sm'
                : 'bro-card rounded-tl-sm text-slate-100'
            )}
          >
            {m.content || '…'}
          </div>
        )}
        {hasCard && <CardSwitch card={m.card} />}
      </div>
    </div>
  );
}
