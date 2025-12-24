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
const { startDailyResetScheduler } = require('./utils/scheduler');

const app = express();

// 安全头设置
app.use(helmet({
  contentSecurityPolicy: false, // 如果前端需要加载外部资源，可以禁用
  crossOriginEmbedderPolicy: false
}));

// 压缩响应
app.use(compression());

// CORS配置（生产环境）
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // 允许无origin的请求（如移动应用、Postman等）
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志记录（生产环境使用更详细的格式）
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// 静态文件（可选）
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/feedback', feedbackRoutes);

// 健康检查端点（用于部署平台监控）
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 在根路径之前添加静态文件服务配置
// 生产环境：提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  console.log(`📦 Serving frontend from ${frontendBuildPath}`);
  app.use(express.static(frontendBuildPath));
  
  // 处理前端路由（SPA）
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 根路径
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  } else {
    res.json({
      name: 'BRO AI Backend API',
      version: '1.0.0',
      status: 'running',
        endpoints: {
        auth: '/api/auth',
        ai: '/api/ai',
        usage: '/api/usage',
        conversations: '/api/conversations',
        feedback: '/api/feedback',
        health: '/health'
      }
    });
  }
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: '请求的资源不存在'
  });
});

// 统一错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // CORS错误
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS_ERROR',
      message: '跨域请求被拒绝'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Backend listening on port ${port}`);
  // 启动每日用量重置定时任务
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startDailyResetScheduler();
  }
});

