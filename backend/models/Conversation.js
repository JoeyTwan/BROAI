const { supabase } = require('../config/database');

// 临时使用内存数据库（用于本地开发测试，仅在Supabase连接失败时使用）
const MEMORY_CONVERSATIONS = new Map(); // key: conversation_id, value: conversation object
const MEMORY_MESSAGES = new Map(); // key: conversation_id, value: array of messages

const CONVERSATIONS_TABLE = 'conversations';
const MESSAGES_TABLE = 'messages';

/**
 * 获取用户的所有对话
 */
async function getUserConversations(userId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 获取用户对话列表:', userId);
    
    const { data: conversations, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // 为每个对话加载消息
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: messages, error: messagesError } = await supabase
          .from(MESSAGES_TABLE)
          .select('role, content')
          .eq('conversation_id', conv.id)
          .order('order_index', { ascending: true });

        if (messagesError) {
          console.error(`[Supabase] 获取对话 ${conv.id} 的消息失败:`, messagesError);
          return { ...conv, messages: [] };
        }

        return {
          id: conv.id,
          title: conv.title,
          pinned: conv.pinned || false,
          createdAt: new Date(conv.created_at).getTime(),
          messages: (messages || []).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        };
      })
    );

    return conversationsWithMessages;
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 获取对话列表失败，切换到内存数据库:', error);
    
    const userConversations = [];
    
    // 遍历所有对话，找出属于该用户的
    for (const [id, conv] of MEMORY_CONVERSATIONS) {
      if (conv.user_id === userId) {
        // 获取对话的消息
        const messages = MEMORY_MESSAGES.get(id) || [];
        
        userConversations.push({
          id: conv.id,
          title: conv.title,
          pinned: conv.pinned || false,
          createdAt: new Date(conv.created_at).getTime(),
          messages: messages.map(msg => ({ role: msg.role, content: msg.content }))
        });
      }
    }
    
    // 按置顶状态和创建时间排序
    userConversations.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    
    return userConversations;
  }
}

/**
 * 创建新对话
 */
async function createConversation(userId, title = '新对话', conversationId = null) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 创建新对话:', userId, conversationId || '自动生成');
    
    const insertData = {
      user_id: userId,
      title: title
    };
    
    // 如果提供了ID，使用提供的ID（前端生成的UUID）
    if (conversationId) {
      insertData.id = conversationId;
    }
    
    const { data: conversation, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: conversation.id,
      title: conversation.title,
      pinned: conversation.pinned || false,
      createdAt: new Date(conversation.created_at).getTime(),
      messages: []
    };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 创建对话失败，切换到内存数据库:', error);
    
    const id = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newConversation = {
      id,
      user_id: userId,
      title,
      pinned: false,
      created_at: now,
      updated_at: now
    };
    
    MEMORY_CONVERSATIONS.set(id, newConversation);
    MEMORY_MESSAGES.set(id, []); // 初始化空消息数组
    
    return {
      id: newConversation.id,
      title: newConversation.title,
      pinned: newConversation.pinned || false,
      createdAt: new Date(newConversation.created_at).getTime(),
      messages: []
    };
  }
}

/**
 * 更新对话（标题、置顶状态）
 */
async function updateConversation(conversationId, userId, updates) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 更新对话:', conversationId, userId, updates);
    
    // 验证对话属于该用户
    const { data: existing, error: checkError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (checkError || !existing || existing.user_id !== userId) {
      throw new Error('对话不存在或无权限');
    }

    const { data, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 更新对话失败，切换到内存数据库:', error);
    
    const conversation = MEMORY_CONVERSATIONS.get(conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    if (conversation.user_id !== userId) {
      throw new Error('无权限操作该对话');
    }
    
    // 更新对话信息
    const updatedConversation = {
      ...conversation,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    MEMORY_CONVERSATIONS.set(conversationId, updatedConversation);
    return updatedConversation;
  }
}

/**
 * 删除对话
 */
async function deleteConversation(conversationId, userId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 删除对话:', conversationId, userId);
    
    // 验证对话属于该用户
    const { data: existing, error: checkError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (checkError || !existing || existing.user_id !== userId) {
      throw new Error('对话不存在或无权限');
    }

    // 删除对话（消息会通过外键级联删除）
    const { error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 删除对话失败，切换到内存数据库:', error);
    
    const conversation = MEMORY_CONVERSATIONS.get(conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    if (conversation.user_id !== userId) {
      throw new Error('无权限操作该对话');
    }
    
    // 删除对话和相关消息
    MEMORY_CONVERSATIONS.delete(conversationId);
    MEMORY_MESSAGES.delete(conversationId);
    
    return { success: true };
  }
}

/**
 * 保存对话的消息
 */
async function saveConversationMessages(conversationId, userId, messages) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 保存对话消息:', conversationId, userId, `${messages.length}条消息`);
    
    // 验证对话属于该用户
    const { data: existing, error: checkError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (checkError || !existing || existing.user_id !== userId) {
      throw new Error('对话不存在或无权限');
    }

    // 删除旧消息
    const { error: deleteError } = await supabase
      .from(MESSAGES_TABLE)
      .delete()
      .eq('conversation_id', conversationId);

    if (deleteError) {
      throw deleteError;
    }

    // 插入新消息
    if (messages && messages.length > 0) {
      const messagesToInsert = messages.map((msg, index) => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        order_index: index
      }));

      const { error: insertError } = await supabase
        .from(MESSAGES_TABLE)
        .insert(messagesToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 保存对话消息失败，切换到内存数据库:', error);
    
    const conversation = MEMORY_CONVERSATIONS.get(conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    if (conversation.user_id !== userId) {
      throw new Error('无权限操作该对话');
    }
    
    // 格式化消息并保存
    const formattedMessages = messages.map((msg, index) => ({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      order_index: index
    }));
    
    MEMORY_MESSAGES.set(conversationId, formattedMessages);
    return { success: true };
  }
}

/**
 * 批量保存或更新对话（用于同步）
 */
async function syncConversations(userId, conversations) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 同步用户对话:', userId, `${conversations.length}个对话`);
    
    // 获取用户现有的对话ID列表
    const { data: existing, error: fetchError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      throw fetchError;
    }

    const existingIds = new Set((existing || []).map(c => c.id));

    // 处理每个对话
    for (const conv of conversations) {
      if (existingIds.has(conv.id)) {
        // 更新现有对话
        await updateConversation(conv.id, userId, {
          title: conv.title,
          pinned: conv.pinned || false
        });
        // 更新消息
        await saveConversationMessages(conv.id, userId, conv.messages);
      } else {
        // 创建新对话（需要先创建对话，再保存消息）
        const { data: newConv, error: createError } = await supabase
          .from(CONVERSATIONS_TABLE)
          .insert({
            id: conv.id, // 使用前端生成的ID
            user_id: userId,
            title: conv.title,
            pinned: conv.pinned || false
          })
          .select()
          .single();

        if (createError) {
          console.error('[Supabase] 创建对话失败:', createError);
          continue;
        }

        // 保存消息
        if (conv.messages && conv.messages.length > 0) {
          await saveConversationMessages(conv.id, userId, conv.messages);
        }
      }
    }

    return { success: true };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 同步对话失败，切换到内存数据库:', error);
    
    for (const conv of conversations) {
      if (!conv.id) continue;
      
      // 检查对话是否存在
      const existing = MEMORY_CONVERSATIONS.get(conv.id);
      
      if (!existing) {
        // 创建新对话
        const now = new Date().toISOString();
        const newConversation = {
          id: conv.id,
          user_id: userId,
          title: conv.title,
          pinned: conv.pinned || false,
          created_at: conv.createdAt ? new Date(conv.createdAt).toISOString() : now,
          updated_at: now
        };
        
        MEMORY_CONVERSATIONS.set(conv.id, newConversation);
      } else {
        // 更新现有对话
        const updatedConversation = {
          ...existing,
          title: conv.title,
          pinned: conv.pinned || false,
          updated_at: new Date().toISOString()
        };
        
        MEMORY_CONVERSATIONS.set(conv.id, updatedConversation);
      }
      
      // 保存消息
      if (conv.messages && conv.messages.length > 0) {
        const formattedMessages = conv.messages.map((msg, index) => ({
          conversation_id: conv.id,
          role: msg.role,
          content: msg.content,
          order_index: index
        }));
        
        MEMORY_MESSAGES.set(conv.id, formattedMessages);
      }
    }
    
    return { success: true };
  }
}

module.exports = {
  getUserConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  saveConversationMessages,
  syncConversations
};