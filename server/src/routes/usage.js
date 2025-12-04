import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';
import { config } from '../config.js';

const router = Router();

router.get('/current', authRequired, async (req, res) => {
  const { rows } = await query(
    `select daily_used, total_used, last_reset_date
       from public.user_limits
      where user_id=$1`,
    [req.user.id]
  );
  const data = rows[0] ?? { daily_used: 0, total_used: 0, last_reset_date: new Date() };
  return res.json({
    dailyUsed: data.daily_used,
    dailyLimit: config.usage.dailyLimit,
    totalUsed: data.total_used,
    lastResetDate: data.last_reset_date
  });
});

export default router;


