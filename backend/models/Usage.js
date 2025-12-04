const { supabase } = require('../config/database');

const USAGE_TABLE = 'user_usage';
const LOG_TABLE = 'api_logs';
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 100);

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 获取明天的日期字符串，用于计算重置时间
 */
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * 获取用户用量记录
 */
async function getUserUsage(userId) {
  const { data, error } = await supabase
    .from(USAGE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data;
}

/**
 * 检查并增加用量 - 核心函数
 * 1. 检查是否需要重置（如果last_reset_date不是今天）
 * 2. 如果daily_count >= 100，抛出错误
 * 3. 否则，daily_count + 1, total_count + 1
 * 4. 返回更新后的daily_count和剩余次数
 */
async function checkAndIncrementUsage(userId) {
  const today = getTodayDate();
  const record = await getUserUsage(userId);

  let dailyCount = 0;
  let totalCount = 0;
  let needsReset = false;

  // 如果记录不存在，创建新记录
  if (!record) {
    dailyCount = 1;
    totalCount = 1;
    needsReset = false;
  } else {
    // 检查是否需要重置
    const lastResetDate = record.last_reset_date;
    needsReset = lastResetDate !== today;

    if (needsReset) {
      // 需要重置：daily_count 归零，total_count 保持不变
      dailyCount = 1;
      totalCount = (record.total_count || 0) + 1;
    } else {
      // 不需要重置：检查是否超过限制
      dailyCount = (record.daily_count || 0) + 1;
      totalCount = (record.total_count || 0) + 1;

      if (record.daily_count >= DAILY_LIMIT) {
        const resetTime = getTomorrowDate();
        throw {
          code: 'DAILY_LIMIT_EXCEEDED',
          message: '今日使用次数已用完，请明天再来',
          resetTime,
          dailyCount: record.daily_count,
          limit: DAILY_LIMIT
        };
      }
    }
  }

  // 更新数据库
  const { error } = await supabase.from(USAGE_TABLE).upsert(
    {
      user_id: userId,
      daily_count: dailyCount,
      total_count: totalCount,
      last_reset_date: today,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('更新用量失败:', error);
    throw new Error('用量更新失败');
  }

  const remaining = Math.max(0, DAILY_LIMIT - dailyCount);

  return {
    dailyCount,
    totalCount,
    remaining,
    limit: DAILY_LIMIT,
    resetTime: getTomorrowDate()
  };
}

/**
 * 记录API调用日志
 */
async function logUsage(userId, payload = {}) {
  const logData = {
    user_id: userId,
    endpoint: payload.endpoint || '/api/ai/chat',
    input_tokens: payload.input_tokens || 0,
    output_tokens: payload.output_tokens || 0,
    timestamp: new Date().toISOString()
  };

  const { error } = await supabase.from(LOG_TABLE).insert(logData);
  if (error) {
    console.error('记录API日志失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取当前用量信息（不增加计数）
 */
async function getCurrentUsage(userId) {
  const record = await getUserUsage(userId);
  const today = getTodayDate();

  if (!record) {
    return {
      dailyUsed: 0,
      remaining: DAILY_LIMIT,
      totalUsed: 0,
      limit: DAILY_LIMIT,
      resetTime: getTomorrowDate()
    };
  }

  // 检查是否需要重置
  const needsReset = record.last_reset_date !== today;
  const dailyUsed = needsReset ? 0 : (record.daily_count || 0);
  const remaining = Math.max(0, DAILY_LIMIT - dailyUsed);

  return {
    dailyUsed,
    remaining,
    totalUsed: record.total_count || 0,
    limit: DAILY_LIMIT,
    resetTime: getTomorrowDate()
  };
}

/**
 * 每日重置任务（可选，用于确保数据一致性）
 * 建议使用定时任务（如 node-cron）在每日 00:00 执行
 */
async function resetDailyUsage() {
  const today = getTodayDate();
  const { error } = await supabase
    .from(USAGE_TABLE)
    .update({
      daily_count: 0,
      last_reset_date: today,
      updated_at: new Date().toISOString()
    })
    .neq('last_reset_date', today);

  if (error) {
    console.error('重置用量失败:', error);
    throw error;
  }

  console.log(`[${new Date().toISOString()}] 每日用量已重置`);
  return { success: true, resetDate: today };
}

module.exports = {
  checkAndIncrementUsage,
  logUsage,
  getCurrentUsage,
  resetDailyUsage,
  getTodayDate,
  getTomorrowDate
};

