const cron = require('node-cron');
const { resetDailyUsage } = require('../models/Usage');

/**
 * 每日用量重置定时任务
 * 每天 00:00 执行，重置所有用户的 daily_count
 */
function startDailyResetScheduler() {
  // 每天 00:00 执行
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] 开始执行每日用量重置任务...`);
      await resetDailyUsage();
      console.log(`[${new Date().toISOString()}] 每日用量重置任务完成`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 每日用量重置任务失败:`, error);
    }
  }, {
    timezone: 'Asia/Shanghai' // 根据实际需求调整时区
  });

  console.log('✅ 每日用量重置定时任务已启动 (每天 00:00 执行)');
}

module.exports = { startDailyResetScheduler };


