# Git Push 问题解决方案

## 问题
```
fatal: unable to access 'https://github.com/JoeyTwan/BROAI.git/': Failed to connect to github.com port 443
```

## 解决方案

### 方案1：使用 GitHub Desktop（最简单）

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)
2. 打开 GitHub Desktop
3. File → Add Local Repository → 选择 `/Users/joey/Privacy/AI-project/ClarityAI-2`
4. 点击 Publish repository
5. 输入仓库名称：`BROAI`
6. 点击 Publish

### 方案2：检查网络和代理

```bash
# 检查网络连接
ping github.com

# 如果有代理，配置 Git 使用代理
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy https://proxy.example.com:8080

# 如果没有代理，取消代理设置
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方案3：使用 SSH（推荐，更稳定）

1. **生成 SSH 密钥**（如果还没有）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按回车使用默认路径
# 设置密码（可选）
```

2. **添加 SSH 密钥到 GitHub**：
```bash
# 复制公钥
cat ~/.ssh/id_ed25519.pub
# 或
pbcopy < ~/.ssh/id_ed25519.pub
```

然后：
- 访问 https://github.com/settings/keys
- 点击 "New SSH key"
- 粘贴公钥内容
- 保存

3. **切换到 SSH URL**：
```bash
cd /Users/joey/Privacy/AI-project/ClarityAI-2
git remote set-url origin git@github.com:JoeyTwan/BROAI.git
git push -u origin main
```

### 方案4：使用 GitHub CLI

```bash
# 安装 GitHub CLI（如果还没有）
brew install gh

# 登录 GitHub
gh auth login

# 推送代码
cd /Users/joey/Privacy/AI-project/ClarityAI-2
git push -u origin main
```

### 方案5：手动上传（临时方案）

如果以上都不行，可以：
1. 在 GitHub 上创建仓库
2. 使用网页上传文件（不推荐，但可以作为临时方案）

## 推荐顺序

1. **首选**：使用 GitHub Desktop（最简单）
2. **次选**：配置 SSH 密钥（最稳定）
3. **备选**：使用 GitHub CLI

## 验证连接

```bash
# 测试 HTTPS 连接
curl -I https://github.com

# 测试 SSH 连接
ssh -T git@github.com
```

