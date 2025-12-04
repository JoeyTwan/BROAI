const express = require('express');
const jwt = require('jsonwebtoken');
const { createUser } = require('../models/User');
const { verifyCredentials, authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  
  // 参数验证
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'INVALID_REQUEST',
      message: '邮箱和密码不能为空' 
    });
  }

  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: 'INVALID_EMAIL',
      message: '邮箱格式不正确' 
    });
  }

  // 密码长度验证
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'INVALID_PASSWORD',
      message: '密码长度至少6位' 
    });
  }

  try {
    const user = await createUser(email, password);
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('[注册错误]', error);
    
    // Supabase 错误处理
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return res.status(409).json({ 
        success: false,
        error: 'EMAIL_EXISTS',
        message: '该邮箱已被注册，请使用其他邮箱或直接登录' 
      });
    }

    // 数据库连接错误
    if (error.message?.includes('connect') || error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false,
        error: 'DATABASE_ERROR',
        message: '数据库连接失败，请检查配置或稍后重试' 
      });
    }

    // 其他错误
    res.status(500).json({ 
      success: false,
      error: 'REGISTRATION_FAILED',
      message: process.env.NODE_ENV === 'development' 
        ? `注册失败: ${error.message}` 
        : '注册失败，请稍后重试'
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  
  // 参数验证
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'INVALID_REQUEST',
      message: '邮箱和密码不能为空' 
    });
  }

  try {
    const user = await verifyCredentials(email, password);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误，请检查后重试' 
      });
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    console.error('[登录错误]', error);
    
    // 数据库连接错误
    if (error.message?.includes('connect') || error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false,
        error: 'DATABASE_ERROR',
        message: '数据库连接失败，请检查配置或稍后重试' 
      });
    }

    // 其他错误
    res.status(500).json({ 
      success: false,
      error: 'LOGIN_FAILED',
      message: process.env.NODE_ENV === 'development' 
        ? `登录失败: ${error.message}` 
        : '登录失败，请稍后重试'
    });
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;

