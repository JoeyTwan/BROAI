import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import type { LetterCard, RecipeCard, TravelCard } from '../types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-xs tracking-widest text-slate-400 uppercase mb-2">{title}</div>
      {children}
    </div>
  );
}

function ChipList({ items, color = 'slate' }: { items: string[]; color?: 'slate' | 'sky' | 'amber' | 'rose' }) {
  const map = {
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-200',
    sky: 'bg-sky-500/10 border-sky-500/30 text-sky-100',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-100',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-100'
  } as const;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, i) => (
        <span key={i} className={`rounded-full px-3 py-1 text-sm border ${map[color]}`}>{t}</span>
      ))}
    </div>
  );
}

export const TravelCardView: React.FC<{ card: TravelCard }> = ({ card }) => {
  const budget = card.totalBudgetCents ? (card.totalBudgetCents / 100).toFixed(0) : null;
  return (
    <div className="bro-card rounded-2xl p-5 md:p-6 mt-3 border-sky-500/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-sky-300">行程攻略</div>
          <div className="text-xl md:text-2xl font-semibold">{card.title}</div>
          <div className="text-sm text-slate-400 mt-1">
            📍 {card.destination} · {card.days} 天
            {card.budgetText && <> · 💰 {card.budgetText}</>}
            {budget && <span className="ml-2 font-semibold text-amber-300">约 {budget} 元</span>}
          </div>
        </div>
      </div>

      {card.dailyPlan && card.dailyPlan.length > 0 && (
        <Section title="每日安排">
          <div className="space-y-3">
            {card.dailyPlan.map((d, i) => (
              <div key={i} className="rounded-2xl bg-slate-900/50 border border-slate-700/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-500/20 text-sky-200 text-xs px-2.5 py-0.5 font-semibold">{d.day}</span>
                  <div className="font-medium">{d.title}</div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {d.morning && (
                    <div><span className="text-slate-400">上午：</span>{d.morning}</div>
                  )}
                  {d.noon && (
                    <div><span className="text-slate-400">中午：</span>{d.noon}</div>
                  )}
                  {d.afternoon && (
                    <div><span className="text-slate-400">下午：</span>{d.afternoon}</div>
                  )}
                  {d.evening && (
                    <div><span className="text-slate-400">晚上：</span>{d.evening}</div>
                  )}
                </div>
                {d.tips && (
                  <div className="mt-3 travel-red-tip rounded-xl px-3 py-2 text-sm">
                    ⚠️ {d.tips}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {card.packingList && card.packingList.length > 0 && (
        <Section title="要带的东西">
          <ChipList items={card.packingList} color="sky" />
        </Section>
      )}

      {card.tips && card.tips.length > 0 && (
        <Section title="贴心提醒">
          <ul className="space-y-1.5 text-sm">
            {card.tips.map((t, i) => (
              <li key={i} className="flex gap-2"><span>🔸</span><span>{t}</span></li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

export const RecipeCardView: React.FC<{ card: RecipeCard }> = ({ card }) => {
  return (
    <div className="bro-card rounded-2xl p-5 md:p-6 mt-3 border-orange-500/20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-orange-300">家常菜谱</div>
          <div className="text-xl md:text-2xl font-semibold">{card.title}</div>
          <div className="text-sm text-slate-400 mt-1 flex flex-wrap gap-3">
            {card.serving && <>👥 {card.serving}</>}
            {card.difficulty && <>📈 {card.difficulty}</>}
            {card.timeMinutes && <>⏱ {card.timeMinutes} 分钟</>}
          </div>
        </div>
      </div>

      {card.ingredients && card.ingredients.length > 0 && (
        <Section title="食材">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
            {card.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between border-b border-dashed border-slate-700/60 py-1.5 text-sm">
                <span>{ing.name}</span>
                <span className="text-slate-400">{ing.amount}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {card.tools && card.tools.length > 0 && (
        <Section title="要用的锅碗瓢盆">
          <ChipList items={card.tools} color="amber" />
        </Section>
      )}

      {card.steps && card.steps.length > 0 && (
        <Section title="做法">
          <ol className="space-y-3">
            {card.steps.map((s) => (
              <li key={s.order} className="rounded-2xl bg-slate-900/50 border border-slate-700/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-orange-500/20 text-orange-200 font-semibold flex items-center justify-center text-sm">
                    {s.order}
                  </span>
                  <div className="font-medium flex-1">{s.title}</div>
                  {s.timeMinutes && <span className="text-xs text-slate-400">{s.timeMinutes} 分钟</span>}
                </div>
                <div className="mt-2 text-sm text-slate-300 pl-10">{s.detail}</div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {card.tips && card.tips.length > 0 && (
        <Section title="小贴士">
          <ChipList items={card.tips} color="rose" />
        </Section>
      )}
    </div>
  );
};

export const LetterCardView: React.FC<{ card: LetterCard }> = ({ card }) => {
  const [mode, setMode] = useState<'spoken' | 'wechat'>('spoken');
  const spokenText = [card.greeting, ...(card.paragraphs || []), card.endingSpoken, card.signature ? `—— ${card.signature}` : '']
    .filter(Boolean).join('\n\n');
  return (
    <div className="bro-card rounded-2xl p-5 md:p-6 mt-3 border-fuchsia-500/20">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="text-xs text-fuchsia-300">给小辈写的话</div>
          <div className="text-xl md:text-2xl font-semibold">{card.title}</div>
          <div className="text-sm text-slate-400 mt-1">收件人：{card.recipient}</div>
        </div>
        <div className="inline-flex rounded-xl overflow-hidden border border-slate-700 text-sm">
          <button
            onClick={() => setMode('spoken')}
            className={`px-3 py-1.5 ${mode === 'spoken' ? 'bg-fuchsia-500/25 text-fuchsia-100' : 'text-slate-300'}`}
          >
            念出来的版本
          </button>
          <button
            onClick={() => setMode('wechat')}
            className={`px-3 py-1.5 ${mode === 'wechat' ? 'bg-fuchsia-500/25 text-fuchsia-100' : 'text-slate-300'}`}
          >
            适合发微信的版本
          </button>
        </div>
      </div>

      {mode === 'spoken' ? (
        <pre className="whitespace-pre-wrap font-sans text-slate-100 leading-8 text-[17px] bg-slate-900/50 rounded-2xl border border-slate-700/60 p-5">
          {spokenText}
        </pre>
      ) : (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5">
          <div className="text-xs text-slate-400 mb-2">长按复制，直接粘贴到微信对话框：</div>
          <pre className="whitespace-pre-wrap font-sans text-slate-100 leading-7 text-[16px]">
            {card.wechatText || spokenText}
          </pre>
        </div>
      )}

      <button
        onClick={() => {
          navigator.clipboard?.writeText(mode === 'wechat' ? (card.wechatText || spokenText) : spokenText);
        }}
        className="mt-4 bro-btn rounded-xl px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-sm"
      >
        📋 复制
      </button>
    </div>
  );
};

const CardShell: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  async function toCanvas(): Promise<HTMLCanvasElement | null> {
    if (!ref.current) return null;
    setSaving(true);
    try {
      return await html2canvas(ref.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
    } catch { return null; } finally { setSaving(false); }
  }

  async function saveImage() {
    const canvas = await toCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `省心聊-${title}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  async function shareImage() {
    const canvas = await toCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `省心聊-${title}.png`, { type: 'image/png' });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try { await nav.share({ files: [file], title: '省心聊' }); } catch {}
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `省心聊-${title}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }

  return (
    <div className="mt-3 w-full">
      <div ref={ref}>{children}</div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button onClick={saveImage} disabled={saving} className="bro-btn rounded-xl px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-sm disabled:opacity-50">
          {saving ? '正在生成…' : '💾 保存到手机'}
        </button>
        <button onClick={shareImage} disabled={saving} className="bro-btn rounded-xl px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-sm border border-sky-500/30 disabled:opacity-50">
          📤 转发好友
        </button>
      </div>
    </div>
  );
};

const CardSwitch: React.FC<{ card: any }> = ({ card }) => {
  if (!card || !card.type) return null;
  if (card.type === 'travel') return <CardShell title="行程"><TravelCardView card={card} /></CardShell>;
  if (card.type === 'recipe') return <CardShell title="菜谱"><RecipeCardView card={card} /></CardShell>;
  if (card.type === 'letter') return <CardShell title="信"><LetterCardView card={card} /></CardShell>;
  return null;
};

export default CardSwitch;
