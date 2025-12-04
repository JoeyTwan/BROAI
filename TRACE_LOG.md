# BroAI 变更追溯表

> 如需回退，请按编号（TL-XX）查阅对应条目，了解涉及文件与改动范围。

| 编号  | 日期       | 变更要点（最新在上）                                     | 影响文件/模块                              |
|-------|------------|----------------------------------------------------------|---------------------------------------------|
| TL-14 | 2025-01-XX | 品牌重塑：Logo改为Bro、产品名改为BroAI、UI文案优化      | `frontend/src/App.tsx`                      |
| TL-13 | 2025-01-XX | 消息格式化增强：支持Markdown渲染、一键复制、身份回答优化 | `frontend/src/App.tsx`                      |
| TL-12 | 2025-11-24 | README 新手友好化：详细部署步骤、故障排查、使用说明     | `README.md`、`TROUBLESHOOTING.md`           |
| TL-11 | 2025-11-24 | 生产环境部署配置：Railway/Vercel配置、生产优化、部署文档 | `backend/railway.toml`、`frontend/vercel.json`、`DEPLOYMENT.md` |
| TL-10 | 2025-11-24 | 前端认证与用量UI：登录/注册、用户菜单、用量显示、路由保护 | `frontend/src/components/*`、`frontend/src/App.tsx` |
| TL-09 | 2025-11-24 | 精确用量限制系统：每日100次、自动重置、标准化响应格式   | `backend/models/Usage.js`、`backend/routes/*` |
| TL-08 | 2025-11-24 | 构建 React + Node 全栈版：新增 `frontend/` 与 `server/`  | `frontend/*`、`server/*`、`README.md`       |
| TL-07 | 2025-11-24 | **回退至 TL-05**：移除表单式澄清，恢复一问一答流程       | `index.html`                                |
| TL-06 | 2025-11-24 | 表单式需求澄清（已回退）                                 | `index.html`                                |
| TL-05 | 2025-11-23 | API 密钥安全方案：`config.js`、`.env.example`、文档更新   | `index.html`、`config.js`、`README.md` 等   |
| TL-04 | 2025-11-23 | 接通通义千问 API、流式输出、结构化展示、输入体验优化     | `index.html`                                |
| TL-03 | 2025-11-22 | 新建会话 & 欢迎页、标题截断、置顶高亮                    | `index.html`                                |
| TL-02 | 2025-11-22 | 深色模式、字体优化、会话三点菜单（重命名/置顶/删除）     | `index.html`                                |
| TL-01 | 2025-11-21 | 首版界面：左右分栏、示例会话、Tailwind 布局               | `index.html`                                |

## TL-14 · 2025-01-XX
- **内容**：品牌重塑和UI文案优化，包括：Logo从"GM"改为"Bro"字母设计、产品名称从"Clarity AI"改为"BroAI"、移除"给 Clarity 发送消息"标签、输入框placeholder改为"给哥们儿说说心里话..."、移除深度思考/联网搜索/上传文件功能、"AI 正在思考"改为"哥们儿正在思考"、首页标题和描述文案调整。
- **主要文件**：`frontend/src/App.tsx`
- **备注**：统一品牌形象为"BroAI"，所有UI文案体现"哥们儿"的亲切风格，简化功能按钮，提升用户体验。

## TL-13 · 2025-01-XX
- **内容**：消息格式化功能增强，包括：支持Markdown格式渲染（**加粗**、---分隔线、标题等）、AI回复添加一键复制功能（悬停显示、复制成功反馈）、系统提示词中添加"你是谁"等身份问题的标准回答（"我是你哥们儿，不清楚需求不要紧，让哥们儿来帮你捋清楚。"）。
- **主要文件**：`frontend/src/App.tsx`
- **备注**：改进了`formatMessage`函数，新增`parseInlineMarkdown`处理内联Markdown，复制功能使用Clipboard API，身份回答统一化处理。

## TL-12 · 2025-11-24
- **内容**：重写 README.md，添加详细的新手友好指南，包括：前置要求、获取 API 密钥和数据库配置的详细步骤、环境变量配置说明、数据库初始化步骤、启动服务步骤、使用说明、常见问题排查、项目结构说明、API 端点文档。
- **主要文件**：`README.md`、`TROUBLESHOOTING.md`
- **备注**：每个步骤都有具体的命令和说明，包含 Supabase 和 Dashscope 的详细配置步骤，添加了完整的故障排查指南，让新手也能按照步骤完成部署。

## TL-11 · 2025-11-24
- **内容**：完成生产环境部署配置，包括 Railway 配置文件（railway.toml、nixpacks.toml、Procfile）、Vercel 配置文件（vercel.json）、生产环境优化（compression、helmet、CORS、错误处理）、环境变量检查脚本、完整部署文档（DEPLOYMENT.md）。
- **主要文件**：`backend/railway.toml`、`backend/nixpacks.toml`、`backend/Procfile`、`backend/server.js`、`frontend/vercel.json`、`backend/scripts/check-env.js`、`DEPLOYMENT.md`
- **备注**：后端添加压缩和安全头，CORS 支持多域名，健康检查端点增强，环境变量检查脚本可在部署前验证配置。

## TL-10 · 2025-11-24
- **内容**：完善前端用户认证和用量显示界面，包括登录/注册弹窗（带确认密码、错误提示、模式切换）、用户菜单（下拉菜单、退出登录）、用量徽章（进度条、倒计时、耗尽提示）、API客户端401自动登出、路由保护（未登录提示、用量超限禁用输入）。
- **主要文件**：`frontend/src/components/AuthDialog.tsx`、`frontend/src/components/UsageBadge.tsx`、`frontend/src/components/UserMenu.tsx`、`frontend/src/hooks/useAuth.ts`、`frontend/src/api/client.ts`、`frontend/src/App.tsx`
- **备注**：所有AI请求自动携带JWT token，401时自动清除token并触发登出，用量信息实时显示并自动刷新，用量耗尽时禁用输入框并显示友好提示。

## TL-09 · 2025-11-24
- **内容**：实现精确的用量限制系统，包括 `checkAndIncrementUsage` 核心函数、每日自动重置机制、标准化 API 响应格式（success/error/usage）、定时任务（node-cron）每日 00:00 执行。
- **主要文件**：`backend/models/Usage.js`、`backend/middleware/rateLimit.js`、`backend/routes/ai.js`、`backend/routes/usage.js`、`backend/utils/scheduler.js`、`docs/db-schema.sql`
- **备注**：新增 `user_usage` 和 `api_logs` 表，响应格式统一为 `{success, data/error, usage}`，超限返回 429 状态码和重置时间。

## TL-08 · 2025-11-24
- **内容**：搭建完整全栈方案，新建 `server/`（Express + PostgreSQL + JWT + 用量限制）与 `frontend/`（React + Vite + Tailwind），并更新 README、SQL 模版。
- **主要文件**：`server/*`、`frontend/*`、`docs/db-schema.sql`、`README.md`
- **备注**：前端默认调用 `/api/*`，后端带每日 100 次额度限制，可直接部署 Railway + Vercel。

## TL-07 · 2025-11-24
- **内容**：根据指令回退至 TL-05 状态，删除表单式澄清逻辑，恢复多轮问答式需求澄清。
- **主要文件**：`index.html`
- **备注**：移除 `formState`、表单渲染/提交相关函数，恢复流式对话输出。

## TL-06 · 2025-11-24（已回退）
- **内容**：把聊天式澄清流程升级为表单式；支持动态表单模板、实时校验、表单驱动内容生成。
- **主要文件**：`index.html`
- **备注**：该方案已按 TL-07 要求回退，记录仅供追溯。

## TL-05 · 2025-11-23
- **内容**：实现 API 密钥安全配置，新增 `config.js`、`.env.example`、`README.md`、`SECURITY.md`。
- **主要文件**：`index.html`、`config.js`、`README.md`、`SECURITY.md`
- **备注**：支持 `window.ENV` 和 Vite 环境变量，强调前端密钥风险。

## TL-04 · 2025-11-23
- **内容**：集成通义千问 `qwen-plus`，新增 streaming 打字机、多轮记忆、结构化输出、输入体验优化。
- **主要文件**：`index.html`
- **备注**：加入 `callOpenAI`、`startTypingEffect`、格式化展示、示例会话更新。

## TL-03 · 2025-11-22
- **内容**：完善“新建会话”流程、欢迎界面、标题截断、置顶样式。
- **主要文件**：`index.html`
- **备注**：实现 `showWelcomeView`、`createConversationItem`、置顶标记等。

## TL-02 · 2025-11-22
- **内容**：加入深浅色切换、字体/布局优化、会话项“更多”菜单（重命名/置顶/删除）。
- **主要文件**：`index.html`
- **备注**：实现 `enableInlineRename`、`setPinnedState`、暗色主题配置。

## TL-01 · 2025-11-21
- **内容**：搭建初版 UI——左侧会话列表 + 右侧聊天主区域，使用 Tailwind CSS。
- **主要文件**：`index.html`
- **备注**：建立 Clarity AI 初始结构和示例会话。
