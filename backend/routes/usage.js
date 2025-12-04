const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getCurrentUsage } = require('../models/Usage');

const router = express.Router();

/**
 * GET /api/usage/current
 * 获取当前用户的用量信息（不增加计数）
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const usage = await getCurrentUsage(req.user.id);
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
  } catch (error) {
    console.error('查询用量失败:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_FAILED',
      message: '查询用量失败，请稍后重试'
    });
  }
});

module.exports = router;

