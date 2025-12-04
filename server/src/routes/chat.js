import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { checkUsageLimit } from '../middleware/usageLimit.js';
import { callAI } from '../services/aiClient.js';
import { query } from '../db.js';

const router = Router();

router.post('/chat', authRequired, checkUsageLimit, async (req, res) => {
  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ message: 'messages 字段不能为空' });
  }

  try {
    const reply = await callAI(messages);
    await query(
      `insert into public.api_usage (user_id, endpoint, input_tokens, output_tokens, cost)
       values ($1, $2, $3, $4, $5)`,
      [req.user.id, '/api/ai/chat', 0, 0, 0]
    );
    return res.json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ message: 'AI 服务暂不可用，请稍后再试' });
  }
});

export default router;


