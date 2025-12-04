const { supabase } = require('../config/database');

const CONVERSATIONS_TABLE = 'conversations';
const MESSAGES_TABLE = 'messages';

/**
 * 获取用户的所有对话
 */
async function getUserConversations(userId) {
  const { data: conversations, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取对话列表失败:', error);
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
        console.error(`获取对话 ${conv.id} 的消息失败:`, messagesError);
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
}

/**
 * 创建新对话
 */
async function createConversation(userId, title = '新对话', conversationId = null) {
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
    console.error('创建对话失败:', error);
    throw error;
  }

  return {
    id: conversation.id,
    title: conversation.title,
    pinned: conversation.pinned || false,
    createdAt: new Date(conversation.created_at).getTime(),
    messages: []
  };
}

/**
 * 更新对话（标题、置顶状态）
 */
async function updateConversation(conversationId, userId, updates) {
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
    console.error('更新对话失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除对话
 */
async function deleteConversation(conversationId, userId) {
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
    console.error('删除对话失败:', error);
    throw error;
  }

  return { success: true };
}

/**
 * 保存对话的消息
 */
async function saveConversationMessages(conversationId, userId, messages) {
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
    console.error('删除旧消息失败:', deleteError);
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
      console.error('保存消息失败:', insertError);
      throw insertError;
    }
  }

  return { success: true };
}

/**
 * 批量保存或更新对话（用于同步）
 */
async function syncConversations(userId, conversations) {
  try {
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
          console.error('创建对话失败:', createError);
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
    console.error('同步对话失败:', error);
    throw error;
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

