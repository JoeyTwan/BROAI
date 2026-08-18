const { db } = require('../config/database');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function upsertUserByDevice(deviceId, nickname) {
  const existing = db.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId);
  if (existing) return existing;
  const info = db
    .prepare('INSERT INTO users (device_id, nickname) VALUES (?, ?)')
    .run(deviceId, nickname || '兄弟');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function getByDevice(deviceId) {
  return db.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId) || null;
}

function getById(id) {
  return db.prepare('SELECT id, device_id, nickname, created_at FROM users WHERE id = ?').get(id) || null;
}

function setNickname(id, nickname) {
  db.prepare('UPDATE users SET nickname = ?, updated_at = datetime(?) WHERE id = ?').run(
    nickname || '兄弟',
    'now',
    id
  );
  return getById(id);
}

function listUsers(limit = 100) {
  return db
    .prepare(
      `SELECT u.id, u.device_id, u.nickname, u.created_at,
        COALESCE((SELECT SUM(input_tokens+output_tokens) FROM api_logs l WHERE l.user_id = u.id),0) AS total_tokens
      FROM users u ORDER BY u.created_at DESC LIMIT ?`
    )
    .all(limit);
}

module.exports = { upsertUserByDevice, getByDevice, getById, setNickname, listUsers, today };
