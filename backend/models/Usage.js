const { supabase } = require('../config/database');

// 临时使用内存数据库（用于本地开发测试，仅在Supabase连接失败时使用）
const MEMORY_USAGE = new Map(); // key: user_id, value: usage object
const MEMORY_LOGS = []; // 存储API调用日志

// 常量定义
const USAGE_TABLE = 'user_usage';
const LOG_TABLE = 'api_logs';
const DAILY_LIMIT = 100; // 每日调用限制
const RESET_TIME = '00:00'; // 重置时间（UTC时间）

/**
 * 检查并增加用户用量
 * @param {string|number} userId - 用户ID
 * @returns {Object} - 包含success和remaining字段的对象
 */
async function checkAndIncrementUsage(userId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 检查并增加用户用量:', userId);
    
    const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD

    // 获取用户用量记录
    const { data: existing, error: fetchError } = await supabase
      .from(USAGE_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();

    let currentCount = 0;
    let needsReset = false;

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // 未找到记录，创建新记录
        console.log('[Supabase] 用户首次使用，创建新的用量记录');
      } else {
        throw fetchError;
      }
    } else {
      // 检查是否需要重置今日用量
      needsReset = existing.last_reset_date !== today;
      currentCount = needsReset ? 0 : existing.daily_count;
    }

    // 检查是否超过限制
    if (currentCount >= DAILY_LIMIT) {
      console.log('[Supabase] 用户用量已达上限:', userId, currentCount, '/', DAILY_LIMIT);
      return { success: false, remaining: 0 };
    }

    // 更新用量
    const newDailyCount = currentCount + 1;
    const newTotalCount = existing ? existing.total_count + 1 : 1;
    
    if (existing) {
      // 更新现有记录
      const { error: updateError } = await supabase
        .from(USAGE_TABLE)
        .update({
          daily_count: newDailyCount,
          total_count: newTotalCount,
          last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // 创建新记录
      const { error: insertError } = await supabase
        .from(USAGE_TABLE)
        .insert({
          user_id: userId,
          daily_count: newDailyCount,
          total_count: newTotalCount,
          last_reset_date: today,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }
    }

    const remaining = DAILY_LIMIT - newDailyCount;
    console.log('[Supabase] 增加用量成功:', userId, newDailyCount, '/', DAILY_LIMIT, '剩余:', remaining);
    return { success: true, remaining };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 检查并增加用户用量失败，切换到内存数据库:', error);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 格式: YYYY-MM-DD
    
    // 获取用户今日用量
    let usage = MEMORY_USAGE.get(userId);
    
    if (!usage || usage.date !== today) {
      // 初始化或重置今日用量
      usage = {
        user_id: userId,
        count: 0,
        date: today,
        updated_at: now.toISOString()
      };
      MEMORY_USAGE.set(userId, usage);
      console.log('[内存数据库] 初始化今日用量:', userId, today);
    }
    
    // 检查是否超过限制
    if (usage.count >= DAILY_LIMIT) {
      console.log('[内存数据库] 用户用量已达上限:', userId, usage.count, '/', DAILY_LIMIT);
      return { success: false, remaining: 0 };
    }
    
    // 增加用量计数
    usage.count += 1;
    usage.updated_at = now.toISOString();
    MEMORY_USAGE.set(userId, usage);
    
    const remaining = DAILY_LIMIT - usage.count;
    console.log('[内存数据库] 增加用量成功:', userId, usage.count, '/', DAILY_LIMIT, '剩余:', remaining);
    
    return { success: true, remaining };
  }
}

/**
 * 记录API调用日志
 */
async function logUsage(userId, payload = {}) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 记录API调用日志:', userId);
    
    const logData = {
      user_id: userId,
      endpoint: payload.endpoint || '/api/ai/chat',
      input_tokens: payload.input_tokens || 0,
      output_tokens: payload.output_tokens || 0,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from(LOG_TABLE).insert(logData);
    if (error) {
      throw error;
    }
    console.log('[Supabase] API日志已记录:', userId);
    return true;
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 记录API调用日志失败，切换到内存数据库:', error);
    
    const logData = {
      user_id: userId,
      endpoint: payload.endpoint || '/api/ai/chat',
      input_tokens: payload.input_tokens || 0,
      output_tokens: payload.output_tokens || 0,
      timestamp: new Date().toISOString()
    };
    
    MEMORY_LOGS.push(logData);
    console.log('[内存数据库] API日志已记录:', userId);
    
    return true;
  }
}

/**
 * 获取当前用量信息（不增加计数）
 */
async function getCurrentUsage(userId) {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 获取当前用量信息:', userId);
    
    const today = new Date().toISOString().split('T')[0]; // 格式: YYYY-MM-DD

    // 获取用户用量记录
    const { data: existing, error: fetchError } = await supabase
      .from(USAGE_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // 未找到记录
        console.log('[Supabase] 用户用量记录不存在');
        return {
          dailyUsed: 0,
          remaining: DAILY_LIMIT,
          totalUsed: 0,
          limit: DAILY_LIMIT,
          resetTime: getTomorrowDate()
        };
      } else {
        throw fetchError;
      }
    }

    // 检查是否需要重置今日用量
    const needsReset = existing.last_reset_date !== today;
    const dailyUsed = needsReset ? 0 : existing.daily_count;
    const remaining = Math.max(0, DAILY_LIMIT - dailyUsed);

    return {
      dailyUsed,
      remaining,
      totalUsed: existing.total_count || 0,
      limit: DAILY_LIMIT,
      resetTime: getTomorrowDate()
    };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 获取当前用量信息失败，切换到内存数据库:', error);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 格式: YYYY-MM-DD
    
    // 获取用户今日用量
    let usage = MEMORY_USAGE.get(userId);
    
    if (!usage || usage.date !== today) {
      // 初始化或重置今日用量
      usage = {
        user_id: userId,
        count: 0,
        date: today,
        updated_at: now.toISOString()
      };
      MEMORY_USAGE.set(userId, usage);
    }
    
    const remaining = DAILY_LIMIT - usage.count;
    
    return {
      dailyUsed: usage.count,
      remaining,
      totalUsed: usage.count, // 内存数据库中不跟踪总用量
      limit: DAILY_LIMIT,
      resetTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).toISOString()
    };
  }
}

/**
 * 每日重置任务（可选，用于确保数据一致性）
 * 建议使用定时任务（如 node-cron）在每日 00:00 执行
 */
async function resetDailyUsage() {
  try {
    // 优先使用Supabase
    console.log('[Supabase] 执行每日用量重置任务');
    
    // 由于我们使用date字段来跟踪每日用量，不需要显式重置
    // 新的一天会自动创建新的记录
    console.log('[Supabase] 每日用量重置完成（基于date字段自动管理）');
    return { success: true, resetDate: getTodayDate() };
  } catch (error) {
    // Supabase失败时，使用内存数据库
    console.error('[Supabase] 执行每日用量重置任务失败，切换到内存数据库:', error);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // 格式: YYYY-MM-DD
    
    for (const [userId, usage] of MEMORY_USAGE) {
      if (usage.date !== today) {
        MEMORY_USAGE.set(userId, {
          user_id: userId,
          count: 0,
          date: today,
          updated_at: now.toISOString()
        });
      }
    }
    
    console.log('[内存数据库] 每日用量重置完成');
    return { success: true, resetDate: today };
  }
}

// 获取今天的日期字符串 (YYYY-MM-DD)
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// 获取明天的日期字符串，用于计算重置时间
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

module.exports = {
  checkAndIncrementUsage,
  logUsage,
  getCurrentUsage,
  resetDailyUsage,
  getTodayDate,
  getTomorrowDate
};