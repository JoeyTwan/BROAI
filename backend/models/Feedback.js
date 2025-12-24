const { supabase } = require('../config/database');

// 临时使用内存数据库（用于本地开发测试，仅在Supabase连接失败时使用）
const MEMORY_FEEDBACK = [];
let nextId = 1;

const FEEDBACK_TABLE = 'feedback';

/**
 * 创建用户反馈
 */
async function createFeedback(userId, content) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 创建用户反馈:', userId);
    
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .insert({
        user_id: userId,
        content: content.trim(),
        likes: 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[Supabase] 反馈已创建:', data.id);
    
    return {
      id: data.id,
      userId: data.user_id,
      content: data.content,
      status: data.status,
      createdAt: new Date(data.created_at).toISOString()
    };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 创建用户反馈失败，切换到内存数据库:', error);
    
    const newFeedback = {
      id: nextId++,
      user_id: userId,
      content: content.trim(),
      status: 'pending', // 默认状态
      likes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    MEMORY_FEEDBACK.push(newFeedback);
    console.log('[内存数据库] 反馈已创建:', newFeedback.id);
    
    return {
      id: newFeedback.id,
      userId: newFeedback.user_id,
      content: newFeedback.content,
      status: newFeedback.status,
      createdAt: newFeedback.created_at
    };
  }
}

/**
 * 获取所有反馈（管理员用）
 */
async function getAllFeedback(limit = 100, offset = 0) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 获取所有反馈');
    
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select(`
        id,
        content,
        status,
        likes,
        created_at,
        updated_at,
        users:user_id (
          id,
          email
        )
      `)
      .order('likes', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      content: item.content,
      status: item.status,
      likes: item.likes,
      createdAt: new Date(item.created_at).toISOString(),
      updatedAt: new Date(item.updated_at).toISOString(),
      userEmail: item.users?.email || '已删除用户'
    }));
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 获取所有反馈失败，切换到内存数据库:', error);
    
    // 按点赞数降序，创建时间降序排序
    const sortedFeedback = [...MEMORY_FEEDBACK].sort((a, b) => {
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // 应用分页
    const paginatedFeedback = sortedFeedback.slice(offset, offset + limit);
    
    return paginatedFeedback.map(item => ({
      id: item.id,
      content: item.content,
      status: item.status,
      likes: item.likes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userEmail: `user_${item.user_id}@example.com` // 模拟用户邮箱
    }));
  }
}

/**
 * 获取反馈总数
 */
async function getFeedbackCount() {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 获取反馈总数');
    
    const { count, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 获取反馈总数失败，切换到内存数据库:', error);
    
    return MEMORY_FEEDBACK.length;
  }
}

/**
 * 更新反馈状态（管理员用）
 */
async function updateFeedbackStatus(feedbackId, status) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 更新反馈状态:', feedbackId, '→', status);
    
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 更新反馈状态失败，切换到内存数据库:', error);
    
    const feedback = MEMORY_FEEDBACK.find(f => f.id === feedbackId);
    
    if (!feedback) {
      const err = new Error('Feedback not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    feedback.status = status;
    feedback.updated_at = new Date().toISOString();
    
    return feedback;
  }
}

/**
 * 为反馈点赞
 */
async function likeFeedback(feedbackId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 为反馈点赞:', feedbackId);
    
    // 先获取当前点赞数
    const { data: currentData, error: fetchError } = await supabase
      .from(FEEDBACK_TABLE)
      .select('likes')
      .eq('id', feedbackId)
      .single();

    if (fetchError) {
      throw fetchError;
    }
    
    // 更新点赞数（+1）
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .update({
        likes: (currentData.likes || 0) + 1
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      likes: data.likes
    };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 为反馈点赞失败，切换到内存数据库:', error);
    
    const feedback = MEMORY_FEEDBACK.find(f => f.id === feedbackId);
    
    if (!feedback) {
      const err = new Error('Feedback not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    feedback.likes += 1;
    
    return {
      id: feedback.id,
      likes: feedback.likes
    };
  }
}

/**
 * 删除反馈
 */
async function deleteFeedback(feedbackId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 删除反馈:', feedbackId);
    
    const { error } = await supabase
      .from(FEEDBACK_TABLE)
      .delete()
      .eq('id', feedbackId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 删除反馈失败，切换到内存数据库:', error);
    
    const index = MEMORY_FEEDBACK.findIndex(f => f.id === feedbackId);
    
    if (index === -1) {
      const err = new Error('Feedback not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    MEMORY_FEEDBACK.splice(index, 1);
    
    return { success: true };
  }
}

module.exports = {
  createFeedback,
  getAllFeedback,
  getFeedbackCount,
  updateFeedbackStatus,
  likeFeedback,
  deleteFeedback
};