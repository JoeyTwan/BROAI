-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User usage tracking (精确用量限制表)
create table if not exists public.user_usage (
  id serial primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  daily_count integer not null default 0,
  total_count integer not null default 0,
  last_reset_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- API usage logs (详细调用日志)
create table if not exists public.api_logs (
  id serial primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  endpoint varchar(100) not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  timestamp timestamptz not null default now()
);

-- 兼容旧表结构（保留用于迁移）
create table if not exists public.api_usage (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade,
  endpoint text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cost numeric(10,4) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_limits (
  user_id uuid primary key references public.users(id) on delete cascade,
  daily_used integer not null default 0,
  total_used integer not null default 0,
  last_reset_date date not null default current_date
);

-- Conversations (对话表)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default '新对话',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages (消息表)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  order_index integer not null default 0
);

-- 索引优化
create index if not exists idx_user_usage_user_id on public.user_usage (user_id);
create index if not exists idx_api_logs_user_timestamp on public.api_logs (user_id, timestamp);
create index if not exists idx_api_usage_user_date on public.api_usage (user_id, created_at);
create index if not exists idx_conversations_user_id on public.conversations (user_id);
create index if not exists idx_conversations_created_at on public.conversations (created_at desc);
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_messages_order_index on public.messages (conversation_id, order_index);

