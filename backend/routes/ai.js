const express = require('express');
const { authenticate } = require('../middleware/auth');
const { checkUsage } = require('../middleware/rateLimit');
const { sendChatCompletion } = require('../utils/openai');
const { logUsage } = require('../models/Usage');

const router = express.Router();

/**
 * POST /api/ai/chat
 * AI对话接口，受保护且带用量限制
 */
router.post('/chat', authenticate, checkUsage, async (req, res) => {
  const { messages } = req.body ?? {};
  
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'messages 字段不能为空，且必须为数组'
    });
  }

  try {
    // 调用AI服务
    const reply = await sendChatCompletion(messages);
    
    // 记录API调用日志（异步，不阻塞响应）
    logUsage(req.user.id, {
      endpoint: '/api/ai/chat',
      input_tokens: 0, // 可以后续从AI响应中获取实际token数
      output_tokens: 0
    }).catch(err => console.error('记录日志失败:', err));

    // 获取用量信息
    const usageInfo = req.usageInfo || {};
    
    // 返回标准格式响应
    res.json({
      success: true,
      data: reply,
      usage: {
        used_today: usageInfo.dailyCount || 0,
        remaining_today: usageInfo.remaining || 0,
        total_used: usageInfo.totalCount || 0
      }
    });
  } catch (error) {
    console.error('AI服务错误:', error.response?.data || error.message);
    
    // 如果是AI服务错误
    if (error.response) {
      return res.status(502).json({
        success: false,
        error: 'AI_SERVICE_ERROR',
        message: 'AI 服务暂不可用，请稍后再试'
      });
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试'
    });
  }
});

module.exports = router;

