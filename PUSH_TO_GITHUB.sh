#!/bin/bash

# GitHub Pages 部署脚本
# 使用方法：./PUSH_TO_GITHUB.sh YOUR_USERNAME YOUR_REPO_NAME

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ 错误：请提供GitHub用户名和仓库名称"
    echo "使用方法: ./PUSH_TO_GITHUB.sh YOUR_USERNAME YOUR_REPO_NAME"
    echo "示例: ./PUSH_TO_GITHUB.sh joey ClarityAI-2"
    exit 1
fi

USERNAME=$1
REPO_NAME=$2

echo "🚀 开始推送到GitHub..."
echo "用户名: $USERNAME"
echo "仓库名: $REPO_NAME"

# 检查是否已有远程仓库
if git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  已存在远程仓库，更新中..."
    git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"
else
    echo "➕ 添加远程仓库..."
    git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
fi

# 设置主分支
git branch -M main

# 推送代码
echo "📤 推送代码到GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码已成功推送到GitHub！"
    echo ""
    echo "📋 接下来的步骤："
    echo "1. 访问 https://github.com/$USERNAME/$REPO_NAME"
    echo "2. 进入 Settings → Pages"
    echo "3. 在 Source 中选择 'GitHub Actions'"
    echo "4. 进入 Settings → Secrets and variables → Actions"
    echo "5. 添加 Secret: VITE_API_URL = 你的后端API地址"
    echo "6. 进入 Actions 标签，运行 'Deploy to GitHub Pages' workflow"
    echo ""
    echo "🌐 部署完成后，你的应用将在以下地址可用："
    echo "   https://$USERNAME.github.io/$REPO_NAME/"
else
    echo "❌ 推送失败，请检查："
    echo "1. GitHub仓库是否已创建"
    echo "2. 是否有推送权限"
    echo "3. 网络连接是否正常"
fi

