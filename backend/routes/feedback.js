const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rateLimit');
const {
  createFeedback,
  getAllFeedback,
  getFeedbackCount,
  updateFeedbackStatus,
  likeFeedback,
  deleteFeedback
} = require('../models/Feedback');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'INVALID', message: '内容不能为空' });
  }
  try {
    const data = createFeedback(req.user.id, String(content).slice(0, 2000));
    res.json({ success: true, data, message: '已提交，兄弟记下了' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FAILED', message: err.message });
  }
});

router.get('/', async (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const offset = Number(req.query.offset) || 0;
  try {
    const [feedback, total] = await Promise.all([getAllFeedback(limit, offset), getFeedbackCount()]);
    res.json({ success: true, data: { feedback, total, limit, offset } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FAILED', message: err.message });
  }
});

router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  try {
    const data = updateFeedbackStatus(id, status);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'FAILED', message: err.message });
  }
});

router.post('/:id/like', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const data = likeFeedback(id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FAILED', message: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await deleteFeedback(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FAILED', message: err.message });
  }
});

module.exports = router;
