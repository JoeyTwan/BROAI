const { db } = require('../config/database');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getUsageRow(userId) {
  let row = db.prepare('SELECT * FROM user_usage WHERE user_id = ?').get(userId);
  const t = today();
  if (!row) {
    db.prepare(
      'INSERT INTO user_usage (user_id, daily_count, total_count, last_reset_date) VALUES (?, 0, 0, ?)'
    ).run(userId, t);
    row = db.prepare('SELECT * FROM user_usage WHERE user_id = ?').get(userId);
  }
  if (row.last_reset_date !== t) {
    db.prepare(
      'UPDATE user_usage SET daily_count = 0, last_reset_date = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).run(t, userId);
    row = db.prepare('SELECT * FROM user_usage WHERE user_id = ?').get(userId);
  }
  return row;
}

function checkAndIncrementUsage(userId, dailyLimit) {
  const limit = Number(dailyLimit) || 30;
  const row = getUsageRow(userId);
  if (row.daily_count >= limit) {
    return { success: false, remaining: 0, dailyCount: row.daily_count, totalCount: row.total_count };
  }
  db.prepare(
    'UPDATE user_usage SET daily_count = daily_count + 1, total_count = total_count + 1, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).run(userId);
  const updated = getUsageRow(userId);
  return {
    success: true,
    dailyCount: updated.daily_count,
    totalCount: updated.total_count,
    remaining: Math.max(0, limit - updated.daily_count)
  };
}

function getCurrentUsage(userId, dailyLimit) {
  const limit = Number(dailyLimit) || 30;
  const row = getUsageRow(userId);
  return {
    dailyUsed: row.daily_count,
    remaining: Math.max(0, limit - row.daily_count),
    totalUsed: row.total_count,
    limit,
    resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
  };
}

function logUsage(userId, payload = {}) {
  const { endpoint, input_tokens, output_tokens, model, cost_cents, duration_ms, error, device_id } = payload;
  db.prepare(
    `INSERT INTO api_logs
    (date, user_id, device_id, endpoint, model, input_tokens, output_tokens, cost_cents, duration_ms, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    today(),
    userId,
    device_id || null,
    endpoint || '/api/ai/chat',
    model || null,
    Number(input_tokens) || 0,
    Number(output_tokens) || 0,
    Number(cost_cents) || 0,
    Number(duration_ms) || null,
    error || null
  );
  return true;
}

function resetDailyUsage() {
  const t = today();
  db.prepare(
    'UPDATE user_usage SET daily_count = 0, last_reset_date = ?, updated_at = datetime(\'now\') WHERE last_reset_date <> ?'
  ).run(t, t);
  return { success: true, resetDate: t };
}

function getBudget(dateStr = today()) {
  let row = db.prepare('SELECT * FROM daily_budget WHERE date = ?').get(dateStr);
  if (!row) {
    const cap = Number(process.env.DAILY_BUDGET_CNY_CENTS) || 300;
    db.prepare('INSERT INTO daily_budget (date, spent_cents, cap_cents) VALUES (?, 0, ?)').run(dateStr, cap);
    row = db.prepare('SELECT * FROM daily_budget WHERE date = ?').get(dateStr);
  }
  return row;
}

function addBudgetSpend(cents, dateStr = today()) {
  getBudget(dateStr);
  db.prepare('UPDATE daily_budget SET spent_cents = spent_cents + ? WHERE date = ?').run(
    Math.max(0, Number(cents) || 0),
    dateStr
  );
  return getBudget(dateStr);
}

function setBudgetCap(capCents, dateStr = today()) {
  getBudget(dateStr);
  db.prepare('UPDATE daily_budget SET cap_cents = ? WHERE date = ?').run(
    Math.max(0, Number(capCents) || 0),
    dateStr
  );
  return getBudget(dateStr);
}

function getBudgetStats(days = 7) {
  const rows = db
    .prepare(
      'SELECT date, spent_cents, cap_cents FROM daily_budget ORDER BY date DESC LIMIT ?'
    )
    .all(days);
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalCalls = db.prepare('SELECT COUNT(*) AS c FROM api_logs').get().c;
  return { days: rows, users, totalCalls };
}

function touchDeviceLimit(deviceId) {
  const now = new Date();
  const day = today();
  const ts = now.toISOString();
  let row = db.prepare('SELECT * FROM device_limits WHERE device_id = ?').get(deviceId);
  if (!row || row.day !== day) {
    db.prepare(
      `INSERT INTO device_limits (device_id, day, calls, window_starts_at, window_calls)
       VALUES (?, ?, 1, ?, 1)
       ON CONFLICT(device_id) DO UPDATE SET
        day=excluded.day, calls=1, window_starts_at=excluded.window_starts_at, window_calls=1`
    ).run(deviceId, day, ts);
    return { calls: 1, windowCalls: 1, overDay: false, overWindow: false };
  }
  // 滑动窗口：30秒 内不超过 3 次
  const WINDOW_MS = 30 * 1000;
  const WINDOW_MAX = 3;
  const DAY_MAX = Number(process.env.DEVICE_DAY_MAX) || 25;
  const windowStart = row.window_starts_at ? new Date(row.window_starts_at).getTime() : now.getTime();
  const newWindowCalls = now.getTime() - windowStart > WINDOW_MS ? 1 : row.window_calls + 1;
  const newWindowStart = newWindowCalls === 1 ? ts : row.window_starts_at;
  const nextCalls = row.calls + 1;
  const overDay = nextCalls > DAY_MAX;
  const overWindow = newWindowCalls > WINDOW_MAX;
  db.prepare(
    'UPDATE device_limits SET day=?, calls=?, window_starts_at=?, window_calls=? WHERE device_id=?'
  ).run(day, nextCalls, newWindowStart, Math.min(newWindowCalls, 999), deviceId);
  return { calls: nextCalls, windowCalls: newWindowCalls, overDay, overWindow };
}

module.exports = {
  today,
  checkAndIncrementUsage,
  getCurrentUsage,
  logUsage,
  resetDailyUsage,
  getBudget,
  addBudgetSpend,
  setBudgetCap,
  getBudgetStats,
  touchDeviceLimit
};
