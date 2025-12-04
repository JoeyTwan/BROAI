# 故障排查指南

## 注册/登录时提示"网络错误"

### 快速检查清单

1. **后端服务是否运行？**
   ```bash
   cd backend
   npm run dev
   ```
   应该看到：`✅ Backend listening on port 4000`

2. **检查后端健康状态**
   在浏览器访问：`http://localhost:4000/health`
   应该返回：`{"status":"ok",...}`

3. **检查前端API配置**
   打开浏览器控制台（F12），查看：
   - Network 标签页中的请求
   - Console 中的错误信息
   - 检查请求URL是否正确

4. **检查环境变量**
   ```bash
   # 前端
   echo $VITE_API_URL
   # 或查看 frontend/.env 文件
   
   # 后端
   cd backend
   npm run check-env
   ```

### 常见问题

#### 问题1：无法连接到服务器

**症状**：错误信息包含"无法连接到服务器"

**解决方案**：
1. 确认后端服务正在运行
2. 检查 `VITE_API_URL` 是否正确（默认：`http://localhost:4000`）
3. 检查防火墙是否阻止了连接
4. 尝试在浏览器直接访问 `http://localhost:4000/health`

#### 问题2：CORS错误

**症状**：浏览器控制台显示 CORS 相关错误

**解决方案**：
1. 检查后端 `CLIENT_URL` 环境变量
2. 确保 `CLIENT_URL` 包含前端地址（如：`http://localhost:5173`）
3. 重启后端服务

#### 问题3：401未授权错误

**症状**：登录后立即被登出

**解决方案**：
1. 检查 `JWT_SECRET` 是否设置
2. 清除浏览器 localStorage：`localStorage.clear()`
3. 重新注册/登录

#### 问题4：数据库连接失败

**症状**：后端日志显示数据库错误

**解决方案**：
1. 检查 `SUPABASE_URL` 和 `SUPABASE_KEY` 是否正确
2. 确认 Supabase 项目正常运行
3. 确认已执行 `docs/db-schema.sql` 创建表结构

### 调试步骤

1. **打开浏览器开发者工具**（F12）
2. **查看 Network 标签**：
   - 找到失败的请求（通常是 `/api/auth/register` 或 `/api/auth/login`）
   - 查看请求状态码（红色表示失败）
   - 查看响应内容

3. **查看 Console 标签**：
   - 查看是否有 JavaScript 错误
   - 查看是否有网络错误信息

4. **检查后端日志**：
   ```bash
   cd backend
   npm run dev
   ```
   查看终端输出的错误信息

### 测试API连接

在浏览器控制台运行：

```javascript
// 测试健康检查
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// 测试注册接口
fetch('http://localhost:4000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test123' })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 获取帮助

如果以上方法都无法解决问题，请提供：
1. 浏览器控制台的完整错误信息
2. 后端终端的错误日志
3. 网络请求的详细信息（从 Network 标签复制）
