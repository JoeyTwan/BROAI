const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getUserConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  syncConversations
} = require('../models/Conversation');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const data = await getUserConversations(req.user.id);
    // 兼容列表字段：列表不含 messages，前端自己再按 id 取
    const list = (data || []).map((c) => ({
      id: c.id,
      title: c.title,
      scene: c.scene || null,
      pinned: !!c.pinned,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()
    }));
    res.json({ success: true, conversations: list });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FETCH_FAILED', message: err.message });
  }
});

router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const convs = await getUserConversations(req.user.id);
    const c = convs.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: '对话不存在' });
    // 把 card 放到 metadata 里，让前端少改
    const messages = (c.messages || []).map((m, idx) => ({
      id: `${c.id}_m${idx}`,
      role: m.role,
      content: m.content,
      metadata: m.card ? { card: m.card } : null
    }));
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FETCH_FAILED', message: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { title, id, scene } = req.body || {};
  try {
    const data = createConversation(req.user.id, title || '新对话', id, scene);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'CREATE_FAILED', message: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, pinned, scene } = req.body || {};
  try {
    const data = updateConversation(id, req.user.id, { title, pinned, scene });
    res.json({ success: true, data });
  } catch (err) {
    const code = err.message.includes('无权限') ? 'NOT_FOUND' : 'UPDATE_FAILED';
    res.status(404).json({ success: false, error: code, message: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteConversation(id, req.user.id);
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: err.message });
  }
});

router.post('/sync', authenticate, async (req, res) => {
  const { conversations } = req.body || {};
  if (!Array.isArray(conversations)) {
    return res.status(400).json({ success: false, error: 'INVALID', message: 'conversations 必须为数组' });
  }
  try {
    syncConversations(req.user.id, conversations);
    res.json({ success: true, message: '已同步' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'SYNC_FAILED', message: err.message });
  }
});

module.exports = router;
