# GitHub Pages 部署指南

## 📋 前置步骤

### 1. 在GitHub上创建仓库

1. 访问 https://github.com/new
2. 创建新仓库（例如：`ClarityAI-2`）
3. **不要**初始化 README、.gitignore 或 license
4. 点击 "Create repository"

### 2. 推送代码到GitHub

在本地执行以下命令（将 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为你的实际值）：

```bash
cd /Users/joey/Privacy/AI-project/ClarityAI-2

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送代码
git branch -M main
git push -u origin main
```

### 3. 配置GitHub Pages

1. 进入你的GitHub仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 中选择 **GitHub Actions**
4. 保存设置

### 4. 配置环境变量

1. 进入仓库 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下密钥：

   - **Name**: `VITE_API_URL`
   - **Value**: 你的后端API地址（例如：`https://your-backend.railway.app`）

### 5. 触发部署

1. 进入仓库 **Actions** 标签
2. 点击 **Deploy to GitHub Pages** workflow
3. 点击 **Run workflow** → **Run workflow**
4. 等待部署完成（约2-3分钟）

## 🎉 完成！

部署完成后，你的应用将在以下地址可用：
- `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## ⚠️ 重要提示

### 关于后端API

GitHub Pages 只能部署静态网站，**不能运行后端服务器**。

你需要：
1. 将后端部署到 Railway 或 Render
2. 在 GitHub Secrets 中设置 `VITE_API_URL` 为你的后端地址
3. 确保后端已配置 CORS，允许 GitHub Pages 域名访问

### 关于路由

如果你的仓库名称不是 `ClarityAI-2`，需要修改 `frontend/vite.config.ts` 中的 `base` 配置：

```typescript
base: process.env.GITHUB_PAGES === 'true' ? '/YOUR_REPO_NAME/' : '/'
```

### 更新代码

每次推送代码到 `main` 分支后，GitHub Actions 会自动重新部署。

```bash
git add .
git commit -m "Update features"
git push
```

## 🔧 故障排查

### 部署失败

1. 检查 **Actions** 标签中的错误日志
2. 确认 `VITE_API_URL` 已正确设置
3. 确认后端服务正常运行

### 页面空白

1. 检查浏览器控制台的错误
2. 确认 `VITE_API_URL` 指向正确的后端地址
3. 检查后端 CORS 配置

### API请求失败

1. 确认后端已部署并运行
2. 检查后端日志
3. 确认 CORS 配置允许 GitHub Pages 域名

## 📝 注意事项

- GitHub Pages 是免费的，但有一些限制
- 如果仓库是私有的，需要 GitHub Pro 才能使用 Pages
- 建议使用自定义域名以获得更好的性能

