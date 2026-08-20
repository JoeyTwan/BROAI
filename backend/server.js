require('dotenv').config();
const fs = require('fs');
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
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());

const frontendBuildPath = path.join(__dirname, '../frontend/dist');
const distReady = fs.existsSync(frontendBuildPath) && fs.existsSync(path.join(frontendBuildPath, 'index.html'));
if (distReady) {
  console.log(`[省心聊] 提供前端静态文件：${frontendBuildPath}`);
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/') || req.path === '/' || req.path.endsWith('.svg') || req.path.endsWith('.png') || req.path.endsWith('.ico')) {
      return express.static(frontendBuildPath, {
        setHeaders(res2, filePath) {
          if (filePath.endsWith('.css')) res2.setHeader('Content-Type', 'text/css; charset=utf-8');
          if (filePath.endsWith('.js')) res2.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res2.setHeader('Cache-Control', filePath.includes('index-') ? 'public, max-age=31536000, immutable' : 'no-cache');
        }
      })(req, res, next);
    }
    next();
  });
}

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isLocalhost = origin && /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin.replace(/^https?:\/\//, ''));
      if (isLocalhost) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS: ' + origin));
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

const frontendBuildPath_ = path.join(__dirname, '../frontend/dist');
if (distReady) {
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendBuildPath_, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: '省心聊 Backend API',
      version: '2.0.0',
      status: 'running',
      hint: '未找到前端构建产物，请到 frontend 目录执行 npm run build',
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
  if (err.message && err.message.startsWith('Not allowed by CORS')) {
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
