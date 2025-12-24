# BRO AI 上线计划

## 1. 项目概述

BRO AI 是一个基于通义千问的智能需求澄清助手，采用前后端分离架构：
- **前端**: React 18 + Vite + Tailwind CSS
- **后端**: Node.js 18 + Express + PostgreSQL (Supabase)
- **部署目标**: 
  - 前端：Vercel
  - 后端：Railway
  - 数据库：Supabase

## 2. 上线前准备

### 2.1 技术准备

| 任务 | 负责人 | 完成时间 | 状态 |
|------|--------|----------|------|
| 代码审核 | 开发团队 | 2025-12-25 | ⏳ |
| 前端单元测试 | 开发团队 | 2025-12-25 | ⏳ |
| 后端API测试 | 开发团队 | 2025-12-25 | ⏳ |
| 数据库迁移脚本验证 | 开发团队 | 2025-12-25 | ⏳ |
| 环境变量检查脚本运行 | 开发团队 | 2025-12-25 | ⏳ |

### 2.2 资源准备

| 资源 | 负责人 | 完成时间 | 状态 |
|------|--------|----------|------|
| Supabase 项目创建 | 运维 | 2025-12-25 | ⏳ |
| Railway 账户创建 | 运维 | 2025-12-25 | ⏳ |
| Vercel 账户创建 | 运维 | 2025-12-25 | ⏳ |
| 通义千问 API 密钥获取 | 产品 | 2025-12-25 | ⏳ |
| JWT 密钥生成 | 运维 | 2025-12-25 | ⏳ |

## 3. 详细上线步骤

### 3.1 数据库准备 (Supabase)

#### 3.1.1 创建数据库
1. 登录 [Supabase](https://app.supabase.com)
2. 创建新项目：
   - 名称：BRO AI
   - 数据库密码：设置强密码并保存
   - 区域：选择离目标用户最近的区域
3. 等待项目创建完成（约2分钟）

#### 3.1.2 初始化数据库表
1. 进入 Supabase 项目 → SQL Editor
2. 执行 `docs/db-schema.sql` 中的所有SQL语句
3. 验证表创建成功：
   - users 表
   - user_usage 表
   - api_logs 表
   - conversations 表
   - feedback 表

#### 3.1.3 获取数据库配置
1. 进入 Settings → API
2. 记录以下信息：
   - Project URL → SUPABASE_URL
   - service_role key → SUPABASE_KEY

### 3.2 后端部署 (Railway)

#### 3.2.1 部署方式
- **推荐**: 通过 GitHub 部署
  1. 登录 [Railway](https://railway.app)
  2. 创建新项目 → Deploy from GitHub repo
  3. 选择仓库，设置 `backend` 为根目录
  4. Railway 自动检测 Node.js 并构建

- **备选**: 通过 Railway CLI
  ```bash
  cd backend
  railway login
  railway init
  railway link
  railway up
  ```

#### 3.2.2 环境变量配置
在 Railway Dashboard → Variables 中设置：

**必需变量：**
```bash
SUPABASE_URL=https://levgugyyqylvsetabgih.supabase.co
SUPABASE_KEY=sb_publishable_mewnqhsEnxXeJ0UYx_bAlQ_nI1bBdPh
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

#### 3.2.3 验证部署
1. 访问 `https://your-backend.railway.app/health` → 应返回 `{"status":"ok",...}`
2. 检查日志，确保无错误

### 3.3 前端部署 (Vercel)

#### 3.3.1 部署方式
- **推荐**: 通过 GitHub 部署
  1. 登录 [Vercel](https://vercel.com)
  2. Add New Project → 导入 GitHub 仓库
  3. 配置项目：
     - Framework Preset: Vite
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `dist`

- **备选**: 通过 Vercel CLI
  ```bash
  cd frontend
  vercel login
  vercel
  ```

#### 3.3.2 环境变量配置
在 Vercel Dashboard → Settings → Environment Variables 中设置：
```bash
VITE_API_URL=https://your-backend.railway.app
```

#### 3.3.3 验证部署
1. 访问前端 URL，应显示登录界面
2. 检查控制台，确保无错误

### 3.4 跨域配置更新
1. 确保后端环境变量 `CLIENT_URL` 设置为前端 Vercel URL
2. 如有多个前端地址，用逗号分隔：`https://app.vercel.app,https://www.example.com`

## 4. 功能测试

### 4.1 基础功能测试

| 测试项 | 测试方法 | 预期结果 | 负责人 | 状态 |
|--------|----------|----------|--------|------|
| 用户注册 | 访问前端，尝试注册新用户 | 注册成功，自动登录 | 测试团队 | ⏳ |
| 用户登录 | 访问前端，使用注册账号登录 | 登录成功，显示聊天界面 | 测试团队 | ⏳ |
| AI 对话 | 登录后发送消息给 AI | AI 正常回复，流式输出 | 测试团队 | ⏳ |
| 会话管理 | 创建、重命名、删除会话 | 功能正常，数据持久化 | 测试团队 | ⏳ |
| 用量显示 | 查看右上角用量 | 显示 100/100，使用后递减 | 测试团队 | ⏳ |
| 反馈功能 | 提交反馈 | 反馈成功，存储到数据库 | 测试团队 | ⏳ |

### 4.2 边界测试

| 测试项 | 测试方法 | 预期结果 | 负责人 | 状态 |
|--------|----------|----------|--------|------|
| 超出每日限制 | 连续发送 101 条消息 | 收到友好提示，无法继续使用 | 测试团队 | ⏳ |
| 无效 API 密钥 | 故意设置错误的 API 密钥 | 后端返回友好错误，前端显示 | 测试团队 | ⏳ |
| 网络中断 | 聊天过程中断开网络 | 显示网络错误，自动重连 | 测试团队 | ⏳ |
| 大消息输入 | 发送超长文本 | 系统正常处理，无崩溃 | 测试团队 | ⏳ |

### 4.3 性能测试

| 测试项 | 测试方法 | 预期结果 | 负责人 | 状态 |
|--------|----------|----------|--------|------|
| 页面加载速度 | 使用 Lighthouse 测试 | 性能分数 > 80 | 测试团队 | ⏳ |
| API 响应时间 | 使用 Postman 测试 | 平均响应时间 < 1s | 测试团队 | ⏳ |
| 并发测试 | 模拟 100 个用户同时访问 | 系统稳定，无崩溃 | 测试团队 | ⏳ |

## 5. 监控与维护

### 5.1 监控配置

| 监控项 | 实现方式 | 负责人 | 状态 |
|--------|----------|--------|------|
| 后端健康检查 | 定期访问 `/health` 端点 | 运维团队 | ⏳ |
| 前端错误监控 | 集成 Sentry 或类似工具 | 运维团队 | ⏳ |
| 数据库性能监控 | Supabase 内置监控 | 运维团队 | ⏳ |
| API 调用日志 | 后端日志 + Supabase 日志 | 开发团队 | ⏳ |

### 5.2 维护计划

| 维护项 | 频率 | 负责人 | 状态 |
|--------|------|--------|------|
| 日志审查 | 每日 | 运维团队 | ⏳ |
| 数据库备份 | 每日（Supabase 自动） | 运维团队 | ⏳ |
| 依赖更新 | 每周 | 开发团队 | ⏳ |
| 性能优化 | 每月 | 开发团队 | ⏳ |

## 6. 回滚计划

### 6.1 后端回滚
1. 登录 Railway Dashboard → Deployments
2. 选择之前成功的部署 → Redeploy
3. 验证服务恢复正常

### 6.2 前端回滚
1. 登录 Vercel Dashboard → Deployments
2. 选择之前成功的部署 → ⋮ → Promote to Production
3. 验证前端恢复正常

### 6.3 数据库回滚
1. 登录 Supabase Dashboard → Database → Backups
2. 选择最近的备份 → Restore
3. 验证数据恢复正常

## 7. 上线时间安排

| 阶段 | 时间 | 负责人 |
|------|------|--------|
| 上线前准备 | 2025-12-25 | 开发团队 |
| 数据库初始化 | 2025-12-26 09:00-10:00 | 运维团队 |
| 后端部署 | 2025-12-26 10:00-11:00 | 开发团队 |
| 前端部署 | 2025-12-26 11:00-12:00 | 开发团队 |
| 功能测试 | 2025-12-26 13:00-15:00 | 测试团队 |
| 性能测试 | 2025-12-26 15:00-16:00 | 测试团队 |
| 最终验证 | 2025-12-26 16:00-17:00 | 所有团队 |
| 正式上线 | 2025-12-27 09:00 | 项目负责人 |

## 8. 风险评估与应对

| 风险 | 影响 | 应对措施 | 负责人 |
|------|------|----------|--------|
| 数据库连接失败 | 服务不可用 | 提前验证 Supabase 配置，准备备选数据库 | 运维团队 |
| API 密钥失效 | AI 功能不可用 | 准备备用 API 密钥，监控使用量 | 产品团队 |
| 部署失败 | 延迟上线 | 提前进行预部署测试，准备回滚方案 | 开发团队 |
| 流量超出预期 | 系统崩溃 | 设置限流机制，监控服务器负载 | 运维团队 |
| CORS 配置错误 | 前后端无法通信 | 提前验证 CORS 配置，准备快速修复方案 | 开发团队 |

## 9. 上线后验证

### 9.1 24小时监控
- 密切关注服务状态和错误日志
- 监控 API 调用成功率
- 检查数据库连接状态

### 9.2 用户反馈收集
- 启用反馈功能
- 设立用户支持渠道
- 定期收集和分析用户反馈

## 10. 文档更新

### 10.1 技术文档
- 更新部署文档
- 更新 API 文档
- 更新环境变量配置说明

### 10.2 用户文档
- 更新用户使用指南
- 添加常见问题解答
- 更新联系方式

---

**上线计划审核**

| 角色 | 签名 | 日期 |
|------|------|------|
| 项目负责人 | | |
| 开发团队负责人 | | |
| 测试团队负责人 | | |
| 运维团队负责人 | | |

**文档版本**: v1.0
**创建日期**: 2025-12-24
**更新日期**: 2025-12-24
