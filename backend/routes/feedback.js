const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createFeedback,
  getAllFeedback,
  getFeedbackCount,
  updateFeedbackStatus,
  likeFeedback,
  deleteFeedback
} = require('../models/Feedback');

const router = express.Router();

/**
 * POST /api/feedback
 * 提交用户反馈
 */
router.post('/', authenticate, async (req, res) => {
  const { content } = req.body || {};
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: '反馈内容不能为空'
    });
  }

  if (content.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: '反馈内容不能超过2000字'
    });
  }

  try {
    const feedback = await createFeedback(req.user.id, content);
    res.json({
      success: true,
      data: feedback,
      message: '反馈已提交，感谢你的建议！'
    });
  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_FEEDBACK_FAILED',
      message: '提交反馈失败，请稍后重试'
    });
  }
});

/**
 * GET /api/feedback
 * 获取所有反馈（所有用户均可访问，无需认证）
 */
router.get('/', async (req, res) => {

  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const [feedback, total] = await Promise.all([
      getAllFeedback(limit, offset),
      getFeedbackCount()
    ]);

    res.json({
      success: true,
      data: {
        feedback,
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FEEDBACK_FAILED',
      message: '获取反馈列表失败'
    });
  }
});

/**
 * PUT /api/feedback/:id/status
 * 更新反馈状态（管理员用）
 * 只有特定邮箱的用户才能访问
 */
router.put('/:id/status', authenticate, async (req, res) => {
  // 检查是否为管理员邮箱
  const ADMIN_EMAIL = 'joeytwan190190@163.com';
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '无权访问此功能'
    });
  }

  const { id } = req.params;
  const { status } = req.body || {};
  
  if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: '状态值无效'
    });
  }

  try {
    const feedback = await updateFeedbackStatus(id, status);
    res.json({
      success: true,
      data: feedback,
      message: '反馈状态已更新'
    });
  } catch (error) {
    console.error('更新反馈状态失败:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_FEEDBACK_FAILED',
      message: '更新反馈状态失败'
    });
  }
});

/**
 * POST /api/feedback/:id/like
 * 为反馈点赞
 */
router.post('/:id/like', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await likeFeedback(id);
    res.json({
      success: true,
      data: result,
      message: '点赞成功'
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      error: 'LIKE_FAILED',
      message: '点赞失败，请稍后重试'
    });
  }
});

/**
 * DELETE /api/feedback/:id
 * 删除反馈（管理员用）
 */
router.delete('/:id', authenticate, async (req, res) => {
  // 检查是否为管理员邮箱
  const ADMIN_EMAIL = 'joeytwan190190@163.com';
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '无权访问此功能'
    });
  }

  const { id } = req.params;

  try {
    await deleteFeedback(id);
    res.json({
      success: true,
      message: '反馈已删除'
    });
  } catch (error) {
    console.error('删除反馈失败:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_FAILED',
      message: '删除反馈失败，请稍后重试'
    });
  }
});

module.exports = router;

