import React from 'react';
import type { SceneItem } from '../types';

export const SCENES: SceneItem[] = [
  {
    key: 'travel',
    name: '做个行程',
    emoji: '🧳',
    tagline: '去哪玩、几天、花多少钱',
    gradient: 'scene-gradient-travel'
  },
  {
    key: 'recipe',
    name: '做个菜谱',
    emoji: '🍲',
    tagline: '家里有啥，我教你做',
    gradient: 'scene-gradient-recipe'
  },
  {
    key: 'letter',
    name: '写个信',
    emoji: '💌',
    tagline: '给孩子、孙女写几句话',
    gradient: 'scene-gradient-letter'
  }
];

interface Props {
  onPick: (key: string, defaultQuestion: string) => void;
  disabled?: boolean;
}

const ScenePicker: React.FC<Props> = ({ onPick, disabled }) => {
  const defaults: Record<string, string> = {
    travel: '我想出去玩几天，帮我出个计划。',
    recipe: '我想做个家常菜，家里人都爱吃的那种。',
    letter: '我想给我儿子写几句话，告诉他注意身体。'
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
      {SCENES.map((s) => (
        <button
          key={s.key}
          disabled={disabled}
          onClick={() => onPick(s.key, defaults[s.key] || '')}
          className={`bro-btn relative overflow-hidden text-left rounded-3xl p-5 md:p-6 shadow-xl ${s.gradient} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <div className="text-5xl md:text-6xl mb-3 select-none">{s.emoji}</div>
          <div className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">
            {s.name}
          </div>
          <div className="text-white/90 mt-1 text-sm md:text-base">{s.tagline}</div>
          <div className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full bg-white/15 blur-2xl" />
        </button>
      ))}
    </div>
  );
};

export default ScenePicker;
