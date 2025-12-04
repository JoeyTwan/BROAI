import { config } from '../config.js';
import { getClient } from '../db.js';

export const checkUsageLimit = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('begin');

    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await client.query(
      `select daily_used, total_used, last_reset_date
         from public.user_limits
        where user_id = $1
        for update`,
      [req.user.id]
    );

    let dailyUsed = 0;
    let totalUsed = 0;
    let lastReset = today;

    if (rows.length) {
      dailyUsed = rows[0].daily_used;
      totalUsed = rows[0].total_used;
      lastReset = rows[0].last_reset_date?.toISOString?.().slice(0, 10) ?? today;
    }

    if (lastReset !== today) {
      dailyUsed = 0;
      lastReset = today;
    }

    if (dailyUsed >= config.usage.dailyLimit) {
      await client.query('rollback');
      return res.status(429).json({ message: '今日免费额度已用完，请明日再试或升级套餐' });
    }

    await client.query(
      `insert into public.user_limits (user_id, daily_used, total_used, last_reset_date)
       values ($1, 1, 1, $2)
       on conflict (user_id)
       do update set
         daily_used = case
           when public.user_limits.last_reset_date <> $2 then 1
           else public.user_limits.daily_used + 1
         end,
         total_used = public.user_limits.total_used + 1,
         last_reset_date = $2`,
      [req.user.id, today]
    );

    await client.query('commit');
    next();
  } catch (error) {
    await client.query('rollback');
    console.error(error);
    res.status(500).json({ message: '用量校验失败' });
  } finally {
    client.release();
  }
};


