const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getCurrentUsage, checkAndIncrementUsage } = require('../models/Usage');
const { loadLLMConfig } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/current', authenticate, async (req, res) => {
  const cfg = loadLLMConfig();
  const limit = Number(req.query.limit) || cfg.deviceDayCap || 25;
  const usage = getCurrentUsage(req.user.id, limit);
  res.json({
    success: true,
    usage: {
      used_today: usage.dailyUsed,
      remaining_today: usage.remaining,
      total_used: usage.totalUsed,
      limit: usage.limit,
      reset_time: usage.resetTime
    }
  });
});

// 给前端预留一个预检查接口（用户点击发送前，提前校验额度）
router.post('/check', authenticate, async (req, res) => {
  const cfg = loadLLMConfig();
  const limit = Number(req.body?.limit) || cfg.deviceDayCap || 25;
  const info = checkAndIncrementUsage(req.user.id, limit);
  res.json({ success: info.success, info });
});

module.exports = router;
