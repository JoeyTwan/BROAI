# API密钥安全配置指南

## ⚠️ 重要安全提示

**纯前端项目中的API密钥仍然可以被任何人查看！**

即使使用环境变量，在前端代码中，API密钥最终仍会被打包到浏览器可访问的JavaScript文件中。任何用户都可以通过浏览器开发者工具查看您的API密钥。

## 推荐的安全方案

### 方案1：后端代理（最安全）⭐ 推荐

创建一个后端服务来代理API调用，将密钥保存在服务器端：

```
前端 → 后端API → 通义千问API
```

**优点：**
- 密钥完全隐藏，用户无法查看
- 可以添加访问控制、限流等功能
- 可以记录使用日志

**实现示例：**
- Node.js + Express
- Python + Flask/FastAPI
- 云函数（Vercel Functions, AWS Lambda等）

### 方案2：使用环境变量（当前实现）

适用于开发环境或内部工具，但**不适用于公开部署**。

**配置步骤：**

1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填入真实API密钥
3. 如果使用Vite等构建工具，环境变量会自动注入
4. 如果使用纯HTML，需要手动配置 `config.js`

### 方案3：使用服务端渲染（SSR）

将API调用放在服务器端，通过SSR框架（如Next.js, Nuxt.js）处理。

## 当前项目的配置方法

### 开发环境

1. 创建 `.env` 文件：
```bash
cp .env.example .env
```

2. 编辑 `.env`，填入真实密钥：
```
VITE_OPENAI_API_KEY=sk-your-actual-key-here
```

3. 如果使用Vite，重启开发服务器

### 纯HTML项目（当前）

直接修改 `config.js` 文件中的 `apiKey` 值，或通过 `window.ENV` 对象注入：

```html
<script>
  window.ENV = {
    VITE_OPENAI_API_KEY: 'your-key-here'
  };
</script>
<script type="module" src="config.js"></script>
```

## 部署平台配置

### Vercel

1. 进入项目设置 → Environment Variables
2. 添加变量：
   - Name: `VITE_OPENAI_API_KEY`
   - Value: 你的API密钥
3. 选择环境（Production, Preview, Development）
4. 重新部署

### Netlify

1. 进入 Site settings → Environment variables
2. 添加变量：
   - Key: `VITE_OPENAI_API_KEY`
   - Value: 你的API密钥
3. 重新部署

### GitHub Pages / 静态托管

⚠️ **不推荐**：静态托管无法隐藏前端代码中的密钥。

建议：
- 使用后端代理服务
- 或使用云函数（如Vercel Functions）

## 最佳实践

1. ✅ **永远不要**在Git仓库中提交 `.env` 文件
2. ✅ 使用 `.gitignore` 排除敏感文件
3. ✅ 定期轮换API密钥
4. ✅ 在生产环境使用后端代理
5. ✅ 设置API使用限额和监控
6. ✅ 使用不同的密钥用于开发和生产环境

## 密钥泄露处理

如果密钥意外泄露：

1. 立即在Dashscope控制台撤销该密钥
2. 生成新的API密钥
3. 更新所有使用该密钥的环境
4. 检查API使用日志，确认是否有异常调用


