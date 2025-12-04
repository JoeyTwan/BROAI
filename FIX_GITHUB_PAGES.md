# 🔧 修复 GitHub Pages 部署问题

## 问题
GitHub Pages 显示的是旧的 `index.html` 页面，而不是当前的 React 应用。

## ✅ 已修复

1. **移除了旧文件**
   - 从 git 中移除了根目录的旧 `index.html`
   - 移除了旧的 `config.js` 和 `server/` 目录
   - 这些文件已添加到 `.gitignore`

2. **修复了构建配置**
   - 更新了 `frontend/vite.config.ts`，设置正确的 base 路径为 `/BROAI/`
   - 添加了构建验证步骤到 GitHub Actions

## 📋 下一步操作

### 1. 推送修复后的代码

```bash
cd /Users/joey/Privacy/AI-project/ClarityAI-2
git push origin main
```

如果网络有问题，使用 GitHub Desktop 推送。

### 2. 触发重新部署

推送代码后，GitHub Actions 会自动触发部署。或者：

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 找到 **Deploy to GitHub Pages** workflow
4. 点击 **Run workflow** → **Run workflow**

### 3. 等待部署完成

- 部署通常需要 2-3 分钟
- 在 Actions 中可以看到部署进度
- 部署完成后，访问 `https://joeytwan.github.io/BROAI/`

### 4. 验证部署

部署完成后，应该看到：
- ✅ 正确的 React 应用界面
- ✅ BroAI 的 Logo 和品牌
- ✅ 登录/注册功能
- ✅ 而不是旧的单文件 HTML 页面

## ⚠️ 重要提示

### Base 路径配置

如果你的仓库名称不是 `BROAI`，需要修改 `frontend/vite.config.ts`：

```typescript
base: process.env.GITHUB_PAGES === 'true' ? '/YOUR_REPO_NAME/' : '/'
```

### 环境变量

确保在 GitHub Secrets 中设置了：
- `VITE_API_URL` = 你的后端 API 地址（例如：`https://your-backend.railway.app`）

### 如果还是显示旧页面

1. **清除浏览器缓存**
   - 按 `Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows) 强制刷新
   - 或使用无痕模式访问

2. **检查 GitHub Pages 设置**
   - 进入仓库 Settings → Pages
   - 确认 Source 是 **GitHub Actions**（不是 branch）
   - 确认部署的 workflow 是 **Deploy to GitHub Pages**

3. **检查 Actions 日志**
   - 进入 Actions 标签
   - 查看最新的部署日志
   - 确认构建成功，没有错误

## 🎯 预期结果

部署成功后，访问 `https://joeytwan.github.io/BROAI/` 应该看到：
- BroAI 的欢迎界面
- "遇事儿别慌，哥们儿来帮" 的标题
- 登录/注册功能
- 而不是旧的单文件 HTML 页面

