export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  card?: TravelCard | RecipeCard | LetterCard | Record<string, unknown> | null;
}

export interface Conversation {
  id: string;
  title: string;
  scene?: 'travel' | 'recipe' | 'letter' | string | null;
  pinned?: boolean;
  createdAt?: number;
  messages: Message[];
}

export interface TravelDailyItem {
  day: string;
  title: string;
  morning?: string;
  noon?: string;
  afternoon?: string;
  evening?: string;
  tips?: string;
}

export interface TravelCard {
  type: 'travel';
  title: string;
  destination: string;
  days: number;
  budgetText?: string;
  totalBudgetCents?: number;
  tips?: string[];
  packingList?: string[];
  dailyPlan?: TravelDailyItem[];
}

export interface RecipeIngredient { name: string; amount: string; }
export interface RecipeStep { order: number; title: string; detail: string; timeMinutes?: number; }
export interface RecipeCard {
  type: 'recipe';
  title: string;
  serving?: string;
  difficulty?: string;
  timeMinutes?: number;
  ingredients?: RecipeIngredient[];
  tools?: string[];
  steps?: RecipeStep[];
  tips?: string[];
}

export interface LetterCard {
  type: 'letter';
  title: string;
  recipient: string;
  greeting?: string;
  paragraphs?: string[];
  endingSpoken?: string;
  signature?: string;
  wechatText?: string;
}

export type AnyCard = TravelCard | RecipeCard | LetterCard;

export interface SceneItem {
  key: 'travel' | 'recipe' | 'letter' | string;
  name: string;
  emoji: string;
  tagline: string;
  gradient: string;
}
