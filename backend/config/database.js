const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'broai.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  nickname TEXT DEFAULT '朋友',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '新对话',
  scene TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  card_json TEXT,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS user_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  daily_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  last_reset_date TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_budget (
  date TEXT PRIMARY KEY,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  cap_cents INTEGER NOT NULL DEFAULT 300
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS device_limits (
  device_id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  window_starts_at TEXT,
  window_calls INTEGER NOT NULL DEFAULT 0
);
`);
}

init();

// 一次性迁移：把老的 qwen-plus / qwen-max 升级到阿里云百炼当前仍有免费额度的新模型
(function migrateLegacyModels() {
  const rows = db.prepare("SELECT key, value FROM app_config WHERE key = ?").all('llm.model');
  if (!rows.length) return;
  const row = rows[0];
  let current;
  try {
    current = JSON.parse(row.value);
  } catch (_e) {
    current = row.value;
  }
  const UPGRADE_MAP = {
    'qwen-plus': 'qwen3.7-plus',
    'qwen-max': 'qwen3.7-max-2026-06-08',
    'qwen-turbo': 'qwen3.7-flash-2026-07-15'
  };
  if (UPGRADE_MAP[current]) {
    const next = UPGRADE_MAP[current];
    db.prepare("UPDATE app_config SET value = ?, updated_at = datetime('now') WHERE key = 'llm.model'")
      .run(JSON.stringify(next));
    console.log(`[省心聊] 模型自动升级：${current} → ${next}`);
  }
})();

function setConfig(key, value) {
  const stmt = db.prepare(`
    INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);
  stmt.run(String(key), value == null ? '' : JSON.stringify(value));
}

function getConfig(key, fallback = null) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    const parsed = JSON.parse(row.value);
    return parsed === undefined || parsed === null ? fallback : parsed;
  } catch (_e) {
    return row.value || fallback;
  }
}

module.exports = { db, DATA_DIR, DB_PATH, init, setConfig, getConfig };
