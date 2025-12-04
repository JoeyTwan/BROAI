import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  // GitHub Pages 部署时，如果仓库名称不是根目录，需要设置 base
  // 例如：如果仓库名是 ClarityAI-2，则 base: '/ClarityAI-2/'
  // 如果仓库名是用户名.github.io，则 base: '/'
  base: process.env.GITHUB_PAGES === 'true' ? (process.env.REPO_NAME ? `/${process.env.REPO_NAME}/` : '/') : '/'
});


