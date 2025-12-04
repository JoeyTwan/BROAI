import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  // GitHub Pages 部署配置
  // 如果仓库名是 BROAI，则 base: '/BROAI/'
  // 如果仓库名是 用户名.github.io，则 base: '/'
  base: process.env.GITHUB_PAGES === 'true' ? '/BROAI/' : '/'
});


