require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const usageRoutes = require('./routes/usage');
const conversationRoutes = require('./routes/conversations');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const { resetDailyUsage } = require('./models/Usage');
const { loadLLMConfig, isSetupReady } = require('./middleware/rateLimit');

const app = express();

// 确保数据库被初始化（模块会执行建表）
require('./config/database');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Admin-Token']
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat/conversations', conversationRoutes); // 前端路径别名
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/status', (_req, res) => {
  const cfg = loadLLMConfig();
  res.json({
    success: true,
    setupReady: isSetupReady(cfg),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (_req, res) => {
  const cfg = loadLLMConfig();
  res.json({
    status: 'ok',
    setupReady: isSetupReady(cfg),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  console.log(`[省心聊] 提供前端静态文件：${frontendBuildPath}`);
  app.use(express.static(frontendBuildPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: '省心聊 Backend API',
      version: '2.0.0',
      status: 'running',
      endpoints: {
        me: '/api/auth/me',
        ai: '/api/ai/chat',
        scenes: '/api/ai/scenes',
        usage: '/api/usage/current',
        conversations: '/api/conversations',
        feedback: '/api/feedback',
        adminStatus: '/api/admin/status',
        adminConfig: '/api/admin/config',
        health: '/health'
      }
    });
  });
}

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: '请求的资源不存在'
  });
});

app.use((err, req, res, _next) => {
  console.error('[Error]', { message: err.message, path: req.path, method: req.method });
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'CORS_ERROR', message: '跨域请求被拒绝' });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 启动时补一次：如果到了新的一天，把没重置的用量重置
try { resetDailyUsage(); } catch (_e) {}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  const cfg = loadLLMConfig();
  console.log(`✅ 省心聊 后端已启动： http://localhost:${port}`);
  console.log(`   LLM 配置就绪：${isSetupReady(cfg) ? '是' : '否（请先访问 /admin 配置 API Key）'}`);
  console.log(`   全局单日预算上限：${cfg.budgetCents} 分 / 单设备单日：${cfg.deviceDayCap} 次`);
});
