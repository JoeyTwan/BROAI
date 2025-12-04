# 🚀 BroAI 快速部署指南

> 5分钟快速上线你的AI助手

## 📋 部署前准备

### 1. 获取必要的密钥和配置

#### ✅ Supabase 数据库
1. 访问 https://app.supabase.com
2. 创建新项目
3. 在 **SQL Editor** 中执行 `docs/db-schema.sql`
4. 在 **Settings → API** 中获取：
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_KEY` (Service Role Key)

#### ✅ 通义千问 API
1. 访问 https://dashscope.aliyun.com
2. 创建 API Key
3. 复制密钥（格式：`sk-xxxxx`）

#### ✅ 生成 JWT_SECRET
```bash
# Mac/Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🎯 部署步骤（按顺序执行）

### 第一步：部署后端（Railway）

1. **登录 Railway**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

2. **创建项目**
   - 点击 **New Project**
   - 选择 **Deploy from GitHub repo**
   - 选择你的仓库
   - **重要**：在设置中将 **Root Directory** 设置为 `backend`

3. **配置环境变量**
   在 Railway Dashboard → Variables 中添加：

   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   JWT_SECRET=your-generated-secret
   OPENAI_API_KEY=sk-your-dashscope-key
   OPENAI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
   OPENAI_MODEL=qwen-plus
   CLIENT_URL=https://your-frontend.vercel.app
   DAILY_LIMIT=100
   PORT=4000
   NODE_ENV=production
   ```

4. **等待部署完成**
   - Railway 会自动构建和部署
   - 部署完成后，记录后端 URL（如：`https://xxx.railway.app`）

5. **验证后端**
   - 访问 `https://your-backend.railway.app/health`
   - 应该返回：`{"status":"ok",...}`

---

### 第二步：部署前端（Vercel）

1. **登录 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录

2. **创建项目**
   - 点击 **Add New Project**
   - 导入你的 GitHub 仓库
   - 配置项目：
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **配置环境变量**
   在 Vercel Dashboard → Settings → Environment Variables 中添加：

   ```bash
   VITE_API_URL=https://your-backend.railway.app
   ```

   ⚠️ **重要**：将 `your-backend.railway.app` 替换为第一步中记录的后端 URL

4. **部署**
   - 点击 **Deploy**
   - 等待构建完成（约 2-3 分钟）

5. **更新后端 CORS 配置**
   - 回到 Railway
   - 更新 `CLIENT_URL` 环境变量为你的 Vercel 前端 URL
   - 例如：`CLIENT_URL=https://your-app.vercel.app`

---

### 第三步：测试部署

1. **访问前端**
   - 打开 Vercel 提供的前端 URL
   - 应该能看到登录界面

2. **测试功能**
   - ✅ 注册新账号
   - ✅ 登录
   - ✅ 发送消息测试 AI 功能
   - ✅ 检查用量显示

---

## 🔧 常见问题

### 后端部署失败

**检查清单：**
- [ ] 所有环境变量都已设置
- [ ] `Root Directory` 设置为 `backend`
- [ ] Supabase 数据库表已创建
- [ ] 查看 Railway 日志中的错误信息

### 前端无法连接后端

**检查清单：**
- [ ] `VITE_API_URL` 已正确设置
- [ ] 后端健康检查端点可访问
- [ ] 浏览器控制台没有 CORS 错误
- [ ] 后端 `CLIENT_URL` 包含前端 URL

### 数据库连接失败

**检查清单：**
- [ ] `SUPABASE_URL` 格式正确（包含 `https://`）
- [ ] `SUPABASE_KEY` 是 Service Role Key（不是 anon key）
- [ ] 数据库表已创建（执行了 `db-schema.sql`）

---

## 📊 部署后检查清单

### 后端（Railway）
- [ ] 健康检查端点返回 `{"status":"ok"}`
- [ ] API 根路径可访问
- [ ] 日志中没有错误

### 前端（Vercel）
- [ ] 页面正常加载
- [ ] 可以注册/登录
- [ ] AI 对话功能正常
- [ ] 用量显示正常

### 功能测试
- [ ] 用户注册 ✅
- [ ] 用户登录 ✅
- [ ] AI 对话 ✅
- [ ] 用量限制 ✅
- [ ] 会话管理 ✅

---

## 🎉 完成！

部署成功后，你的 AI 助手就可以在线上使用了！

**分享你的应用：**
- 前端 URL：`https://your-app.vercel.app`
- 任何人都可以访问并注册使用

---

## 📝 后续更新

### 更新代码
```bash
git add .
git commit -m "Update features"
git push
```

Railway 和 Vercel 会自动检测更改并重新部署。

### 查看日志
- **Railway**: Dashboard → Deployments → Logs
- **Vercel**: Dashboard → Deployments → Functions Logs

---

## 🆘 需要帮助？

- 查看详细文档：`DEPLOYMENT.md`
- 查看 README：`README.md`
- Railway 文档：https://docs.railway.app
- Vercel 文档：https://vercel.com/docs
