import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { query } from '../db.js';

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

export const generateToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

export const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '缺少身份令牌' });
    }
    const payload = jwt.verify(header.split(' ')[1], config.jwtSecret);
    const { rows } = await query('select id, email from public.users where id = $1', [payload.sub]);
    if (!rows.length) {
      return res.status(401).json({ message: '用户不存在或已注销' });
    }
    req.user = rows[0];
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: '身份校验失败，请重新登录' });
  }
};


