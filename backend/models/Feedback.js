const { db } = require('../config/database');

function createFeedback(userId, content) {
  const info = db
    .prepare('INSERT INTO feedback (user_id, content) VALUES (?, ?)')
    .run(userId, String(content || '').trim().slice(0, 2000));
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(info.lastInsertRowid);
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    status: row.status,
    likes: row.likes,
    createdAt: row.created_at
  };
}

function getAllFeedback(limit = 50, offset = 0) {
  return db
    .prepare(
      `SELECT f.id, f.content, f.status, f.likes, f.created_at, f.updated_at, u.nickname
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.likes DESC, f.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset)
    .map((r) => ({
      id: r.id,
      content: r.content,
      status: r.status,
      likes: r.likes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userNickname: r.nickname || '匿名用户'
    }));
}

function getFeedbackCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM feedback').get().c;
}

function updateFeedbackStatus(id, status) {
  if (!['pending', 'reviewed', 'resolved'].includes(status)) throw new Error('状态无效');
  db.prepare('UPDATE feedback SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
}

function likeFeedback(id) {
  db.prepare('UPDATE feedback SET likes = likes + 1 WHERE id = ?').run(id);
  const r = db.prepare('SELECT id, likes FROM feedback WHERE id = ?').get(id);
  return { id: r.id, likes: r.likes };
}

function deleteFeedback(id) {
  db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
  return { success: true };
}

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackCount,
  updateFeedbackStatus,
  likeFeedback,
  deleteFeedback
};
