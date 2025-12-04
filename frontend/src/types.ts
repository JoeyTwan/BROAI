export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
  createdAt?: number;
  messages: Message[];
}


