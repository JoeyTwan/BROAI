# 对话数据关联修复验证指南

## 🔧 修复内容

已修复对话数据与用户账户关联的问题，现在对话数据会：
1. ✅ 存储在数据库中（按用户ID关联）
2. ✅ 登录时从后端自动加载
3. ✅ 创建/更新/删除时同步到后端
4. ✅ 不同用户之间的对话完全隔离

## 📋 部署前准备

### 1. 更新数据库表结构

在 Supabase SQL Editor 中执行以下 SQL（或执行更新后的 `docs/db-schema.sql`）：

```sql
-- Conversations (对话表)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default '新对话',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages (消息表)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  order_index integer not null default 0
);

-- 索引优化
create index if not exists idx_conversations_user_id on public.conversations (user_id);
create index if not exists idx_conversations_created_at on public.conversations (created_at desc);
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_messages_order_index on public.messages (conversation_id, order_index);
```

### 2. 重启后端服务

确保后端服务已重启，新的路由已加载。

## ✅ 验证步骤

### 测试场景 1：用户A创建对话，退出后重新登录

1. **注册/登录账号A**
   - 使用邮箱：`test-a@example.com`
   - 创建密码并登录

2. **创建对话并发送消息**
   - 点击"开启新对话"
   - 发送一条消息："测试消息A"
   - 等待AI回复
   - 再发送一条消息："这是第二条消息"

3. **退出登录**
   - 点击左下角用户菜单
   - 点击"退出登录"

4. **重新登录账号A**
   - 使用相同的邮箱和密码登录
   - ✅ **验证**：应该能看到之前创建的所有对话和消息

### 测试场景 2：用户隔离（用户A看不到用户B的对话）

1. **在账号A下创建对话**
   - 登录账号A
   - 创建对话并发送消息："这是账号A的对话"

2. **退出并登录账号B**
   - 退出账号A
   - 注册/登录新账号B（`test-b@example.com`）
   - ✅ **验证**：不应该看到账号A的任何对话

3. **在账号B下创建对话**
   - 创建新对话并发送消息："这是账号B的对话"
   - ✅ **验证**：只能看到账号B自己的对话

4. **重新登录账号A**
   - 退出账号B
   - 重新登录账号A
   - ✅ **验证**：应该能看到账号A之前创建的所有对话，看不到账号B的对话

### 测试场景 3：对话操作同步

1. **重命名对话**
   - 登录账号A
   - 右键点击一个对话，选择"重命名"
   - 修改标题为"测试重命名"
   - 退出登录
   - 重新登录
   - ✅ **验证**：对话标题应该是"测试重命名"

2. **置顶对话**
   - 选择一个对话，点击置顶按钮
   - 退出登录
   - 重新登录
   - ✅ **验证**：对话应该仍然置顶

3. **删除对话**
   - 删除一个对话
   - 退出登录
   - 重新登录
   - ✅ **验证**：被删除的对话不应该出现

## 🔍 调试方法

### 查看后端日志

在后端控制台或 Railway 日志中，应该能看到：
- `[对话加载] 从后端加载对话列表`
- `[对话同步] 同步对话到后端`

### 查看浏览器控制台

打开浏览器开发者工具（F12），在 Console 中应该能看到：
- `[对话加载] ✅ 成功加载 X 个对话`
- `[对话同步] ✅ 同步成功`

### 检查数据库

在 Supabase Dashboard → Table Editor 中：
1. 查看 `conversations` 表，应该能看到每个用户的对话记录
2. 查看 `messages` 表，应该能看到每条消息都关联到对应的对话
3. 确认 `user_id` 字段正确关联到 `users` 表

## 🐛 常见问题

### 问题1：登录后看不到之前的对话

**可能原因：**
- 数据库表未创建
- 后端路由未注册
- 网络请求失败

**解决方法：**
1. 检查数据库表是否已创建
2. 检查后端日志是否有错误
3. 检查浏览器控制台的网络请求

### 问题2：对话操作后没有同步

**可能原因：**
- 网络请求失败
- 后端API错误

**解决方法：**
1. 查看浏览器控制台的错误信息
2. 查看后端日志
3. 检查网络连接

### 问题3：不同用户能看到对方的对话

**可能原因：**
- 后端查询没有正确过滤 `user_id`
- JWT认证失败

**解决方法：**
1. 检查后端 `getUserConversations` 函数
2. 确认 `req.user.id` 正确获取
3. 检查JWT token是否有效

## 📝 API端点说明

### GET /api/conversations
获取当前用户的所有对话
- **认证**：需要Bearer Token
- **响应**：`{ success: true, data: Conversation[] }`

### POST /api/conversations
创建新对话
- **认证**：需要Bearer Token
- **请求体**：`{ title?: string, id?: string }`
- **响应**：`{ success: true, data: Conversation }`

### PUT /api/conversations/:id
更新对话（标题、置顶状态）
- **认证**：需要Bearer Token
- **请求体**：`{ title?: string, pinned?: boolean }`
- **响应**：`{ success: true, data: Conversation }`

### DELETE /api/conversations/:id
删除对话
- **认证**：需要Bearer Token
- **响应**：`{ success: true, message: '对话已删除' }`

### POST /api/conversations/sync
批量同步对话（前端自动调用）
- **认证**：需要Bearer Token
- **请求体**：`{ conversations: Conversation[] }`
- **响应**：`{ success: true, message: '对话已同步' }`

## ✅ 验证清单

- [ ] 数据库表已创建（conversations、messages）
- [ ] 后端服务已重启
- [ ] 用户A登录后能看到之前的对话
- [ ] 用户B登录后看不到用户A的对话
- [ ] 重命名对话后，重新登录仍然保持
- [ ] 置顶对话后，重新登录仍然置顶
- [ ] 删除对话后，重新登录不会恢复
- [ ] 创建新对话后，重新登录能看到
- [ ] 发送消息后，重新登录能看到所有消息

## 🎉 修复完成

如果以上所有测试都通过，说明对话数据已正确关联到用户账户，修复成功！

