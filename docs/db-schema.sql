-- 兄弟AI (BroAI) SQLite 数据库结构说明（与 backend/config/database.js 保持一致）
-- 代码启动时会自动建表，不需要手动执行本文件；这里只是给 DBA / 二次开发者查阅用。

-- 用户（每台访问设备一条记录；用 device_id 代替注册登录）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  nickname TEXT DEFAULT '兄弟',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 对话
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '新对话',
  scene TEXT,                              -- travel / recipe / letter
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

-- 消息
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  card_json TEXT,                          -- 结构化结果（旅行/菜谱/写信卡片 JSON）
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);

-- 用户反馈
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API 调用日志（用于分析成本 / 排错）
CREATE TABLE IF NOT EXISTS api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  device_id TEXT,
  endpoint TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_date ON api_logs(date);

-- 单用户单日调用次数
CREATE TABLE IF NOT EXISTS user_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  daily_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  last_reset_date TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 全局单日预算（单位：分）
CREATE TABLE IF NOT EXISTS daily_budget (
  date TEXT PRIMARY KEY,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  cap_cents INTEGER NOT NULL DEFAULT 300
);

-- 管理员配置（API Key / BASE URL / 模型 / 单价 / 预算…… 加密后存在 value 里）
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 设备级限流（每天次数 + 1 分钟滑动窗口）
CREATE TABLE IF NOT EXISTS device_limits (
  device_id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  window_starts_at TEXT,
  window_calls INTEGER NOT NULL DEFAULT 0
);


