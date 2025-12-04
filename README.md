# ClarityAI - 智能需求澄清助手

基于通义千问（Qwen）的AI聊天助手，通过多轮对话澄清用户需求并生成高质量内容。

## ✨ 功能特性

- 🤖 **智能需求澄清**：通过多轮对话了解真实需求
- 💬 **流式输出**：打字机效果展示AI回复
- 🎨 **美观界面**：支持亮色/暗色主题切换
- 📝 **会话管理**：支持新建、重命名、置顶、删除会话
- 🔒 **用户系统**：注册/登录、JWT认证、用量限制
- 📊 **用量统计**：实时显示每日剩余次数（100次/天）

---

## 🚀 快速开始（新手完整指南）

### 前置要求

在开始之前，请确保已安装：

- **Node.js** 18+ 和 npm（[下载地址](https://nodejs.org/)）
- **Git**（[下载地址](https://git-scm.com/)）
- 一个 **Supabase** 账号（免费，[注册地址](https://app.supabase.com)）
- 一个 **通义千问 API 密钥**（[获取地址](https://dashscope.aliyun.com)）

---

## 📋 详细部署步骤

### 第一步：获取 API 密钥和数据库配置

#### 1.1 获取通义千问 API 密钥

1. 访问 [Dashscope 控制台](https://dashscope.aliyun.com)
2. 登录/注册账号
3. 进入 **API-KEY 管理**
4. 创建新的 API Key，格式类似：`sk-7dfe8fcbb30e4f5493c1e9350c544114`
5. **复制并保存**这个密钥，稍后会用到

#### 1.2 创建 Supabase 项目

1. 访问 [Supabase](https://app.supabase.com)
2. 点击 **New Project** 创建新项目
3. 填写项目信息：
   - **Name**: ClarityAI（或任意名称）
   - **Database Password**: 设置一个强密码（**务必保存**）
   - **Region**: 选择离你最近的区域
4. 等待项目创建完成（约 2 分钟）

#### 1.3 获取 Supabase 配置信息

1. 在 Supabase 项目页面，点击左侧 **Settings**（齿轮图标）
2. 点击 **API**
3. 找到以下信息并复制：
   - **Project URL** → 这就是 `SUPABASE_URL`
     - 格式：`https://xxxxx.supabase.co`
   - **service_role key** → 这就是 `SUPABASE_KEY`
     - 点击 **Reveal** 显示完整密钥
     - **注意**：使用 `service_role` key，不是 `anon` key

---

### 第二步：克隆项目并安装依赖

```bash
# 1. 克隆项目（如果还没有）
git clone <项目地址>
cd ClarityAI-2

# 2. 安装后端依赖
cd backend
npm install

# 3. 安装前端依赖
cd ../frontend
npm install
```

---

### 第三步：配置后端环境变量

#### 3.1 创建后端 .env 文件

```bash
cd backend
cp env.template .env
```

#### 3.2 编辑 .env 文件

使用你喜欢的编辑器打开 `backend/.env`，填写以下配置：

```env
# 服务器端口（默认即可）
PORT=4000

# 前端地址（本地开发默认即可）
CLIENT_URL=http://localhost:5173

# Supabase 配置（从第一步获取）
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_KEY=你的service_role_key

# 通义千问 API 配置（从第一步获取）
OPENAI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OPENAI_API_KEY=sk-你的API密钥
OPENAI_MODEL=qwen-plus

# JWT 密钥（生成随机字符串）
# 运行命令生成：openssl rand -base64 32
JWT_SECRET=替换为随机生成的字符串

# 每日使用限制
DAILY_LIMIT=100

# 环境
NODE_ENV=development

# 启用定时任务（每日重置用量）
ENABLE_SCHEDULER=true
```

**生成 JWT_SECRET**：

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

将生成的字符串复制到 `JWT_SECRET=` 后面。

---

### 第四步：初始化数据库

#### 4.1 在 Supabase 中执行 SQL

1. 在 Supabase 项目页面，点击左侧 **SQL Editor**
2. 点击 **New query**
3. 打开项目中的 `docs/db-schema.sql` 文件
4. **复制全部内容**到 SQL Editor
5. 点击 **Run** 执行
6. 应该看到成功提示：`Success. No rows returned`

#### 4.2 验证表是否创建成功

1. 在 Supabase 左侧菜单，点击 **Table Editor**
2. 应该能看到以下表：
   - `users` - 用户表
   - `user_usage` - 用户用量表
   - `api_logs` - API 日志表

---

### 第五步：启动后端服务

```bash
cd backend
npm run dev
```

**成功标志**：终端应该显示：

```
✅ Backend listening on port 4000
```

**测试后端**：在浏览器访问 `http://localhost:4000/health`

应该返回 JSON：
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "environment": "development"
}
```

如果看到这个响应，说明后端运行正常！✅

---

### 第六步：配置并启动前端

#### 6.1 创建前端 .env 文件

```bash
cd frontend
echo "VITE_API_URL=http://localhost:4000" > .env
```

或者手动创建 `frontend/.env` 文件，内容：

```env
VITE_API_URL=http://localhost:4000
```

#### 6.2 启动前端开发服务器

```bash
cd frontend
npm run dev
```

**成功标志**：终端应该显示：

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### 6.3 打开应用

在浏览器访问：`http://localhost:5173`

---

### 第七步：注册账号并开始使用

1. **注册账号**：
   - 点击右上角 **登录/注册**
   - 切换到 **注册** 标签
   - 输入邮箱和密码（至少 6 位）
   - 点击 **注册**

2. **开始使用**：
   - 注册成功后会自动登录
   - 右上角显示今日剩余次数（100/100）
   - 在输入框输入你的需求
   - AI 会通过多轮对话澄清需求
   - 最终生成你需要的內容

---

## 🔧 常见问题排查

### 问题 1：注册时提示"网络错误"

**可能原因**：
- 后端服务未启动
- 前端 API 地址配置错误
- 数据库连接失败

**解决步骤**：

1. **检查后端是否运行**：
   ```bash
   cd backend
   npm run dev
   ```
   应该看到 `✅ Backend listening on port 4000`

2. **测试后端连接**：
   浏览器访问 `http://localhost:4000/health`
   如果无法访问，检查端口是否被占用

3. **检查环境变量**：
   ```bash
   cd backend
   npm run check-env
   ```
   确保所有必需变量都已填写

4. **检查前端配置**：
   确认 `frontend/.env` 中的 `VITE_API_URL` 正确

5. **查看浏览器控制台**：
   - 按 F12 打开开发者工具
   - 查看 **Console** 和 **Network** 标签
   - 找到错误信息

### 问题 2：数据库连接失败

**症状**：后端日志显示 Supabase 连接错误

**解决方案**：

1. 检查 `SUPABASE_URL` 和 `SUPABASE_KEY` 是否正确
2. 确认使用的是 `service_role` key，不是 `anon` key
3. 检查 Supabase 项目是否正常运行
4. 确认已执行 `docs/db-schema.sql` 创建表结构

### 问题 3：CORS 错误

**症状**：浏览器控制台显示 CORS 相关错误

**解决方案**：

1. 检查后端 `.env` 中的 `CLIENT_URL`
2. 确保 `CLIENT_URL` 包含前端地址（如：`http://localhost:5173`）
3. 重启后端服务

### 问题 4：JWT 错误

**症状**：登录后立即被登出

**解决方案**：

1. 检查 `JWT_SECRET` 是否设置
2. 清除浏览器 localStorage：
   ```javascript
   // 在浏览器控制台运行
   localStorage.clear()
   ```
3. 重新注册/登录

### 问题 5：API 调用失败

**症状**：AI 回复失败或报错

**解决方案**：

1. 检查 `OPENAI_API_KEY` 是否正确
2. 检查 `OPENAI_API_URL` 是否正确（Dashscope 地址）
3. 确认 API 密钥有足够余额
4. 查看后端日志中的详细错误信息

---

## 📁 项目结构

```
ClarityAI-2/
├── index.html               # 旧版静态界面（可直接打开）
├── config.js               # 旧版前端 API 配置
│
├── backend/                # 后端服务（Node.js + Express）
│   ├── server.js           # 主服务器文件
│   ├── routes/             # API 路由
│   │   ├── auth.js         # 认证路由（注册/登录）
│   │   ├── ai.js           # AI 聊天路由
│   │   └── usage.js        # 用量查询路由
│   ├── models/             # 数据模型
│   │   ├── User.js         # 用户模型
│   │   └── Usage.js        # 用量模型
│   ├── middleware/         # 中间件
│   │   ├── auth.js         # JWT 认证
│   │   └── rateLimit.js    # 用量限制
│   ├── config/             # 配置
│   │   └── database.js     # Supabase 客户端
│   ├── utils/              # 工具函数
│   │   ├── openai.js       # AI API 调用
│   │   └── scheduler.js    # 定时任务
│   ├── env.template        # 环境变量模板
│   ├── railway.toml        # Railway 部署配置
│   └── Procfile            # Render 部署配置
│
├── frontend/               # 前端应用（React + Vite）
│   ├── src/
│   │   ├── App.tsx         # 主应用组件
│   │   ├── components/     # React 组件
│   │   │   ├── AuthDialog.tsx    # 登录/注册对话框
│   │   │   ├── UsageBadge.tsx    # 用量显示
│   │   │   └── UserMenu.tsx      # 用户菜单
│   │   ├── hooks/          # React Hooks
│   │   │   └── useAuth.ts  # 认证状态管理
│   │   ├── api/            # API 客户端
│   │   │   └── client.ts   # Axios 配置
│   │   └── types.ts        # TypeScript 类型定义
│   ├── .env                # 前端环境变量
│   └── vite.config.ts      # Vite 配置
│
├── docs/                   # 文档
│   └── db-schema.sql       # 数据库表结构
│
├── DEPLOYMENT.md           # 生产部署详细指南
├── DEPLOY_QUICKSTART.md    # 5分钟快速部署指南
├── TROUBLESHOOTING.md      # 故障排查指南
├── SECURITY.md             # 安全说明
└── README.md               # 本文件
```

---

## 🚀 生产环境部署

### 快速部署（5分钟）

查看 [DEPLOY_QUICKSTART.md](./DEPLOY_QUICKSTART.md) 获取快速部署指南

### 完整部署指南

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细步骤

### 推荐部署架构

- **前端**: Vercel（自动 HTTPS + CDN）
- **后端**: Railway / Render（Node.js 服务器）
- **数据库**: Supabase（PostgreSQL，已配置）

---

## 🔒 安全注意事项

⚠️ **重要**：纯前端项目中的API密钥仍然可以被查看！

**推荐方案**：
- ✅ **开发/内部工具**：使用环境变量配置
- ✅ **生产/公开部署**：使用后端代理API调用（本项目已实现）

详细说明请查看 [SECURITY.md](./SECURITY.md)

---

## 🛠️ 技术栈

- **前端**：React 18 + Vite + Tailwind CSS
- **后端**：Node.js 18 + Express + PostgreSQL (Supabase)
- **认证**：JWT + bcrypt
- **AI**：通义千问 Dashscope 兼容接口
- **部署**：Vercel (前端) + Railway/Render (后端)

---

## 📝 API 端点说明

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### AI 相关

- `POST /api/ai/chat` - AI 聊天接口（需要认证，自动检查用量限制）

### 用量相关

- `GET /api/usage/current` - 获取当前用量统计（需要认证）

### 健康检查

- `GET /health` - 服务健康状态

---

## 📖 使用说明

### 基本使用流程

1. **注册/登录账号**
   - 首次使用需要注册
   - 注册后自动登录

2. **开始对话**
   - 在输入框输入你的需求
   - AI 会通过多轮对话澄清需求
   - 每次只问一个关键问题

3. **查看用量**
   - 右上角显示今日剩余次数
   - 每日 00:00 自动重置
   - 超出限制时会有友好提示

4. **管理会话**
   - 左侧会话列表可以：
     - 新建会话
     - 重命名会话
     - 置顶会话
     - 删除会话

### 用量限制

- **每日免费额度**：100 次调用
- **重置时间**：每日 00:00（服务器时间）
- **超出限制**：显示友好提示，等待次日重置

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 💡 获取帮助

如果遇到问题：

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 故障排查指南
2. 检查浏览器控制台和后端日志
3. 确认所有环境变量都已正确配置
4. 提交 Issue 描述问题

---

**祝你使用愉快！** 🎉
