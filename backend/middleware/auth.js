const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findByEmail, getById } = require('../models/User');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供身份令牌' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getById(payload.sub);
    if (!user) return res.status(401).json({ message: '用户不存在或已注销' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '令牌无效或已过期' });
  }
}

async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;
  return { id: user.id, email: user.email };
}

module.exports = {
  authenticate,
  verifyCredentials
};


