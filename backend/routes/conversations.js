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

/**
 * GET /api/conversations
 * 获取当前用户的所有对话
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const conversations = await getUserConversations(req.user.id);
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('获取对话列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_CONVERSATIONS_FAILED',
      message: '获取对话列表失败'
    });
  }
});

/**
 * POST /api/conversations
 * 创建新对话
 */
router.post('/', authenticate, async (req, res) => {
  const { title, id } = req.body || {};
  
  try {
    const conversation = await createConversation(req.user.id, title || '新对话', id);
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('创建对话失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_CONVERSATION_FAILED',
      message: '创建对话失败'
    });
  }
});

/**
 * PUT /api/conversations/:id
 * 更新对话（标题、置顶状态）
 */
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, pinned } = req.body || {};
  
  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (pinned !== undefined) updates.pinned = pinned;
    
    const conversation = await updateConversation(id, req.user.id, updates);
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('更新对话失败:', error);
    if (error.message === '对话不存在或无权限') {
      res.status(404).json({
        success: false,
        error: 'CONVERSATION_NOT_FOUND',
        message: '对话不存在或无权限'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'UPDATE_CONVERSATION_FAILED',
        message: '更新对话失败'
      });
    }
  }
});

/**
 * DELETE /api/conversations/:id
 * 删除对话
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  try {
    await deleteConversation(id, req.user.id);
    res.json({
      success: true,
      message: '对话已删除'
    });
  } catch (error) {
    console.error('删除对话失败:', error);
    if (error.message === '对话不存在或无权限') {
      res.status(404).json({
        success: false,
        error: 'CONVERSATION_NOT_FOUND',
        message: '对话不存在或无权限'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'DELETE_CONVERSATION_FAILED',
        message: '删除对话失败'
      });
    }
  }
});

/**
 * POST /api/conversations/sync
 * 同步对话数据（批量保存或更新）
 */
router.post('/sync', authenticate, async (req, res) => {
  const { conversations } = req.body || {};
  
  if (!Array.isArray(conversations)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'conversations 必须是数组'
    });
  }
  
  try {
    await syncConversations(req.user.id, conversations);
    res.json({
      success: true,
      message: '对话已同步'
    });
  } catch (error) {
    console.error('同步对话失败:', error);
    res.status(500).json({
      success: false,
      error: 'SYNC_CONVERSATIONS_FAILED',
      message: '同步对话失败'
    });
  }
});

module.exports = router;

