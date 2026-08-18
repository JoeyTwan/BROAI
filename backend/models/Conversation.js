const { db } = require('../config/database');

function formatConv(row, messages) {
  return {
    id: row.id,
    title: row.title,
    scene: row.scene || null,
    pinned: !!row.pinned,
    createdAt: new Date(row.created_at).getTime(),
    messages: messages
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => ({
        role: m.role,
        content: m.content,
        card: m.card_json ? JSON.parse(m.card_json) : undefined
      }))
  };
}

function getUserConversations(userId) {
  const rows = db
    .prepare(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY pinned DESC, created_at DESC'
    )
    .all(userId);
  const all = rows.map((row) => {
    const msgs = db
      .prepare(
        'SELECT role, content, card_json, order_index FROM messages WHERE conversation_id = ? ORDER BY order_index'
      )
      .all(row.id);
    return formatConv(row, msgs);
  });
  return all;
}

function createConversation(userId, title = '新对话', id, scene) {
  const cid =
    id ||
    `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  db.prepare(
    'INSERT INTO conversations (id, user_id, title, scene, pinned) VALUES (?, ?, ?, ?, 0)'
  ).run(cid, userId, title, scene || null);
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(cid);
  return formatConv(row, []);
}

function updateConversation(id, userId, updates = {}) {
  const existing = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) throw new Error('对话不存在或无权限');
  const title = updates.title !== undefined ? updates.title : existing.title;
  const pinned = updates.pinned !== undefined ? (updates.pinned ? 1 : 0) : existing.pinned;
  const scene = updates.scene !== undefined ? updates.scene : existing.scene;
  db.prepare(
    'UPDATE conversations SET title=?, pinned=?, scene=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?'
  ).run(title, pinned, scene || null, id, userId);
  return { id, title, pinned: !!pinned, scene };
}

function deleteConversation(id, userId) {
  const existing = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) throw new Error('对话不存在或无权限');
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId);
  return { success: true };
}

function saveConversationMessages(id, userId, messages) {
  const existing = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) throw new Error('对话不存在或无权限');
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    const stmt = db.prepare(
      'INSERT INTO messages (conversation_id, role, content, card_json, order_index) VALUES (?, ?, ?, ?, ?)'
    );
    (messages || []).forEach((m, idx) => {
      stmt.run(id, m.role, m.content, m.card ? JSON.stringify(m.card) : null, idx);
    });
  });
  tx();
  return { success: true };
}

function syncConversations(userId, conversations) {
  const tx = db.transaction(() => {
    for (const conv of conversations || []) {
      if (!conv.id) continue;
      const existing = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(conv.id, userId);
      if (!existing) {
        db.prepare(
          'INSERT INTO conversations (id, user_id, title, scene, pinned, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          conv.id,
          userId,
          conv.title || '新对话',
          conv.scene || null,
          conv.pinned ? 1 : 0,
          conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString()
        );
      } else {
        db.prepare(
          'UPDATE conversations SET title=?, pinned=?, scene=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?'
        ).run(
          conv.title || '新对话',
          conv.pinned ? 1 : 0,
          conv.scene || null,
          conv.id,
          userId
        );
      }
      saveConversationMessages(conv.id, userId, conv.messages || []);
    }
  });
  tx();
  return { success: true };
}

module.exports = {
  getUserConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  saveConversationMessages,
  syncConversations
};
