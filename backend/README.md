# ClarityAI 后端服务

Node.js + Express + Supabase 后端服务，提供用户认证、AI对话和用量限制功能。

## 功能特性

- ✅ 用户注册/登录（JWT认证）
- ✅ AI对话接口（集成通义千问）
- ✅ 精确的用量限制系统（每日100次免费调用）
- ✅ 自动每日重置（00:00执行）
- ✅ API调用日志记录
- ✅ 标准化的响应格式

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `env.template` 为 `.env` 并填写配置：

```bash
cp env.template .env
```

必需的环境变量：
- `SUPABASE_URL` - Supabase项目URL
- `SUPABASE_KEY` - Supabase服务密钥
- `JWT_SECRET` - JWT签名密钥（建议使用随机字符串）
- `OPENAI_API_KEY` - 通义千问API密钥
- `OPENAI_API_URL` - API地址（默认：Dashscope兼容接口）
- `DAILY_LIMIT` - 每日免费调用次数（默认：100）
- `PORT` - 服务器端口（默认：4000）

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `../docs/db-schema.sql` 创建表结构。

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

## API 文档

### 认证接口

#### POST /api/auth/register
用户注册

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/login
用户登录

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：** 同注册接口

#### GET /api/auth/me
获取当前用户信息（需要认证）

**Headers：**
```
Authorization: Bearer <token>
```

### AI对话接口

#### POST /api/ai/chat
AI对话（需要认证 + 用量检查）

**Headers：**
```
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ]
}
```

**成功响应：**
```json
{
  "success": true,
  "data": "AI回复内容",
  "usage": {
    "used_today": 15,
    "remaining_today": 85,
    "total_used": 150
  }
}
```

**用量超限响应（429）：**
```json
{
  "success": false,
  "error": "DAILY_LIMIT_EXCEEDED",
  "message": "今日使用次数已用完，请明天再来",
  "resetTime": "2024-01-02T00:00:00.000Z",
  "usage": {
    "used_today": 100,
    "remaining_today": 0,
    "total_used": 500
  }
}
```

### 用量查询接口

#### GET /api/usage/current
获取当前用量信息（需要认证）

**Headers：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "usage": {
    "used_today": 15,
    "remaining_today": 85,
    "total_used": 150,
    "limit": 100,
    "reset_time": "2024-01-02T00:00:00.000Z"
  }
}
```

## 用量限制系统

### 工作原理

1. **每次请求检查**：在每次AI调用前，系统会检查用户当日使用次数
2. **自动重置**：如果 `last_reset_date` 不是今天，自动重置 `daily_count` 为 0
3. **限制检查**：如果 `daily_count >= 100`，返回 429 错误
4. **计数增加**：通过检查后，`daily_count` 和 `total_count` 各 +1
5. **定时任务**：每日 00:00 执行定时任务，确保数据一致性

### 数据库表结构

- `user_usage` - 用户用量记录（每日计数、总计数、重置日期）
- `api_logs` - API调用日志（详细记录每次调用）

### 定时重置任务

系统默认启用每日重置定时任务（每天 00:00 执行）。如需禁用，设置环境变量：

```bash
ENABLE_SCHEDULER=false
```

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "错误描述信息"
}
```

常见错误码：
- `DAILY_LIMIT_EXCEEDED` - 每日用量超限
- `INVALID_REQUEST` - 请求参数错误
- `AI_SERVICE_ERROR` - AI服务错误
- `USAGE_CHECK_FAILED` - 用量检查失败
- `QUERY_FAILED` - 查询失败

## 项目结构

```
backend/
├── server.js              # 主入口
├── package.json
├── env.template           # 环境变量模板
├── config/
│   └── database.js        # Supabase配置
├── models/
│   ├── User.js           # 用户模型
│   └── Usage.js          # 用量模型
├── middleware/
│   ├── auth.js           # JWT认证中间件
│   └── rateLimit.js      # 用量限制中间件
├── routes/
│   ├── auth.js           # 认证路由
│   ├── ai.js             # AI对话路由
│   └── usage.js          # 用量查询路由
└── utils/
    ├── openai.js         # OpenAI客户端
    └── scheduler.js      # 定时任务
```

## 部署

### Railway / Render

1. 连接 GitHub 仓库
2. 设置环境变量
3. 构建命令：`npm install`
4. 启动命令：`npm start`

### 环境变量检查清单

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_KEY`
- [ ] `JWT_SECRET`（建议使用强随机字符串）
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_API_URL`（可选，有默认值）
- [ ] `DAILY_LIMIT`（可选，默认100）
- [ ] `PORT`（可选，默认4000）
- [ ] `CLIENT_URL`（前端地址，用于CORS）

## 开发建议

1. **JWT_SECRET**：生产环境务必使用强随机字符串，可使用 `openssl rand -base64 32` 生成
2. **数据库索引**：已自动创建，确保查询性能
3. **日志记录**：API调用日志异步记录，不影响响应速度
4. **错误处理**：所有错误都有统一格式，便于前端处理

## 许可证

MIT License


