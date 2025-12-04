const { checkAndIncrementUsage } = require('../models/Usage');

/**
 * 用量限制中间件
 * 检查用户当日使用次数，如果超过限制则返回429错误
 */
async function checkUsage(req, res, next) {
  try {
    const usageInfo = await checkAndIncrementUsage(req.user.id);
    // 将用量信息附加到请求对象，供后续路由使用
    req.usageInfo = usageInfo;
    next();
  } catch (error) {
    // 如果是用量超限错误
    if (error.code === 'DAILY_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_EXCEEDED',
        message: error.message,
        resetTime: error.resetTime,
        usage: {
          used_today: error.dailyCount,
          remaining_today: 0,
          total_used: error.totalCount || 0
        }
      });
    }

    // 其他错误
    console.error('用量检查失败:', error);
    res.status(500).json({
      success: false,
      error: 'USAGE_CHECK_FAILED',
      message: '用量校验失败，请稍后重试'
    });
  }
}

module.exports = { checkUsage };

