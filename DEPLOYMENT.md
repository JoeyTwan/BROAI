# BRO AI 生产环境部署指南

本指南将帮助您将 BRO AI 全栈应用部署到生产环境。

## 架构概览

- **前端**: Vercel (静态部署)
- **后端**: Railway / Render (Node.js 服务器)
- **数据库**: Supabase (PostgreSQL)

## 部署步骤

### 第一步：数据库初始化（Supabase）

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 创建新项目或使用现有项目
3. 进入 **SQL Editor**
4. 执行 `docs/db-schema.sql` 中的所有 SQL 语句
5. 记录以下信息：
   - **Project URL** (SUPABASE_URL)
   - **Service Role Key** (SUPABASE_KEY) - 在 Settings → API 中获取

### 第二步：后端部署（Railway）

#### 方式一：通过 GitHub 部署（推荐）

1. 登录 [Railway](https://railway.app)
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择您的仓库
4. 选择 `backend` 目录作为根目录
5. Railway 会自动检测 Node.js 并开始构建

#### 方式二：通过 Railway CLI

```bash
cd backend
railway login
railway init
railway link
railway up
```

#### 环境变量配置

在 Railway Dashboard → Variables 中设置以下环境变量：

**必需变量：**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-key  # 使用 openssl rand -base64 32 生成
OPENAI_API_KEY=sk-your-openai-key
CLIENT_URL=https://your-frontend.vercel.app
```

**可选变量：**
```bash
OPENAI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OPENAI_MODEL=qwen-plus
DAILY_LIMIT=100
PORT=4000
NODE_ENV=production
ENABLE_SCHEDULER=true
```

#### 验证部署

部署完成后，访问：
- `https://your-backend.railway.app/health` - 应该返回 `{"status":"ok",...}`
- `https://your-backend.railway.app/` - 应该返回 API 信息

### 第三步：前端部署（Vercel）

#### 方式一：通过 GitHub 部署（推荐）

1. 登录 [Vercel](https://vercel.com)
2. 点击 **Add New Project**
3. 导入您的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### 方式二：通过 Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

#### 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 中设置：

```bash
VITE_API_URL=https://your-backend.railway.app
```

#### 验证部署

部署完成后，访问您的前端 URL，应该能看到登录界面。

### 第四步：更新 CORS 配置

在 Railway 后端环境变量中，确保 `CLIENT_URL` 设置为您的前端 Vercel URL：

```bash
CLIENT_URL=https://your-frontend.vercel.app
```

如果有多个前端地址，用逗号分隔：
```bash
CLIENT_URL=https://app.example.com,https://www.example.com
```

## 部署检查清单

### 数据库
- [ ] Supabase 项目已创建
- [ ] 数据库表已创建（执行 `docs/db-schema.sql`）
- [ ] 已获取 SUPABASE_URL 和 SUPABASE_KEY

### 后端
- [ ] Railway 项目已创建
- [ ] 代码已推送到 GitHub
- [ ] Railway 已连接到 GitHub 仓库
- [ ] 所有环境变量已设置
- [ ] 健康检查端点 `/health` 可访问
- [ ] API 根路径 `/` 返回正确信息

### 前端
- [ ] Vercel 项目已创建
- [ ] 代码已推送到 GitHub
- [ ] Vercel 已连接到 GitHub 仓库
- [ ] `VITE_API_URL` 环境变量已设置
- [ ] 前端可以正常访问
- [ ] 前端可以成功调用后端 API

### 功能测试
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] AI 对话功能正常
- [ ] 用量限制功能正常
- [ ] 用量显示正常
- [ ] 定时重置任务正常运行

## 环境变量说明

### 后端环境变量

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ | Supabase 服务密钥 | `eyJhbGc...` |
| `JWT_SECRET` | ✅ | JWT 签名密钥 | 随机字符串（32+ 字符） |
| `OPENAI_API_KEY` | ✅ | 通义千问 API 密钥 | `sk-xxx` |
| `CLIENT_URL` | ✅ | 前端 URL（CORS） | `https://app.vercel.app` |
| `OPENAI_API_URL` | ❌ | API 地址 | 默认 Dashscope |
| `OPENAI_MODEL` | ❌ | 模型名称 | 默认 `qwen-plus` |
| `DAILY_LIMIT` | ❌ | 每日免费次数 | 默认 `100` |
| `PORT` | ❌ | 服务器端口 | 默认 `4000` |
| `NODE_ENV` | ❌ | 环境模式 | `production` |
| `ENABLE_SCHEDULER` | ❌ | 启用定时任务 | 默认 `true` |

### 前端环境变量

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `VITE_API_URL` | ✅ | 后端 API URL | `https://backend.railway.app` |

## 生成 JWT_SECRET

使用以下命令生成安全的 JWT_SECRET：

```bash
# Linux/Mac
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 监控和日志

### Railway 日志

在 Railway Dashboard → Deployments → 选择部署 → Logs 查看实时日志。

### Vercel 日志

在 Vercel Dashboard → 项目 → Deployments → 选择部署 → Functions Logs 查看日志。

### 健康检查

定期访问 `/health` 端点监控服务状态：

```bash
curl https://your-backend.railway.app/health
```

## 故障排查

### 后端无法启动

1. 检查环境变量是否全部设置
2. 运行 `node backend/scripts/check-env.js` 检查环境变量
3. 查看 Railway 日志中的错误信息
4. 确认数据库连接正常

### CORS 错误

1. 检查 `CLIENT_URL` 是否设置为正确的前端 URL
2. 确认前端 URL 没有尾部斜杠
3. 检查浏览器控制台的完整错误信息

### 数据库连接失败

1. 确认 `SUPABASE_URL` 和 `SUPABASE_KEY` 正确
2. 检查 Supabase 项目是否正常运行
3. 确认数据库表已创建

### 前端无法调用 API

1. 检查 `VITE_API_URL` 是否正确
2. 确认后端健康检查端点可访问
3. 检查浏览器控制台的网络请求
4. 确认 CORS 配置正确

## 性能优化建议

1. **启用 CDN**: Vercel 自动提供全球 CDN
2. **数据库索引**: 已自动创建，确保查询性能
3. **响应压缩**: 后端已启用 gzip 压缩
4. **静态资源缓存**: Vercel 自动处理静态资源缓存

## 安全建议

1. **JWT_SECRET**: 使用强随机字符串，不要使用默认值
2. **API 密钥**: 不要在代码中硬编码，使用环境变量
3. **CORS**: 只允许信任的前端域名
4. **HTTPS**: Railway 和 Vercel 自动提供 HTTPS
5. **数据库密钥**: 使用 Supabase 的 Service Role Key，不要暴露给前端

## 更新部署

### 更新后端

```bash
git add .
git commit -m "Update backend"
git push
```

Railway 会自动检测更改并重新部署。

### 更新前端

```bash
git add .
git commit -m "Update frontend"
git push
```

Vercel 会自动检测更改并重新部署。

## 回滚部署

### Railway

在 Railway Dashboard → Deployments → 选择之前的部署 → Redeploy

### Vercel

在 Vercel Dashboard → Deployments → 选择之前的部署 → ⋮ → Promote to Production

## 支持

如遇到问题，请查看：
- [Railway 文档](https://docs.railway.app)
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)

## 许可证

MIT License


