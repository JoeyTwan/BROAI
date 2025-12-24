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
  console.log('[验证凭证]', { email, hasPassword: !!password });
  try {
    const user = await findByEmail(email);
    console.log('[用户查找结果]', { userFound: !!user, user });
    
    if (!user) {
      console.log('[验证失败] 用户不存在:', email);
      return null;
    }
    
    // 检查密码哈希是否存在
    if (!user.password_hash) {
      console.log('[验证失败] 用户没有密码哈希:', user.id);
      return null;
    }
    
    const match = await bcrypt.compare(password, user.password_hash);
    console.log('[密码匹配结果]', { match });
    
    if (!match) {
      console.log('[验证失败] 密码不匹配:', email);
    }
    
    return match ? { id: user.id, email: user.email } : null;
  } catch (error) {
    console.error('[验证错误] 发生异常:', error.message);
    console.error('[错误堆栈]', error.stack);
    // 为了安全，不暴露详细错误给客户端，直接返回null
    return null;
  }
}

module.exports = {
  authenticate,
  verifyCredentials
};


