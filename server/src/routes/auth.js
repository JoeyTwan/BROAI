import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword, comparePassword, generateToken, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: '请输入邮箱和密码' });
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `insert into public.users (email, password_hash)
       values ($1, $2)
       returning id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    const token = generateToken(rows[0]);
    return res.status(201).json({ token, user: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: '该邮箱已注册' });
    }
    console.error(error);
    return res.status(500).json({ message: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: '请输入邮箱和密码' });

  const { rows } = await query('select * from public.users where email=$1', [email.toLowerCase()]);
  if (!rows.length) return res.status(401).json({ message: '邮箱或密码错误' });

  const valid = await comparePassword(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ message: '邮箱或密码错误' });

  const token = generateToken(rows[0]);
  return res.json({ token, user: { id: rows[0].id, email: rows[0].email } });
});

router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));

export default router;


