// API配置
// ⚠️ 安全提示：前端代码中的密钥仍然可以被查看
// 建议：使用后端代理API调用，将密钥保存在服务器端

// 配置优先级：
// 1. window.ENV 对象（可通过外部脚本注入，用于生产环境）
// 2. 环境变量（如果使用Vite等构建工具）
// 3. 默认值（仅用于开发测试）

(function() {
  'use strict';
  
  // 从window.ENV读取（推荐用于生产环境）
  const envApiKey = window.ENV?.VITE_OPENAI_API_KEY;
  const envApiUrl = window.ENV?.VITE_OPENAI_API_URL;
  const envModel = window.ENV?.VITE_OPENAI_MODEL;
  
  // 默认配置（开发环境）
  const defaultConfig = {
    apiKey: "sk-7dfe8fcbb30e4f5493c1e9350c544114",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus"
  };
  
  // 创建全局配置对象
  window.APP_CONFIG = {
    OPENAI_API_KEY: envApiKey || defaultConfig.apiKey,
    OPENAI_API_URL: envApiUrl || defaultConfig.apiUrl,
    OPENAI_MODEL: envModel || defaultConfig.model
  };
  
  // 如果使用Vite等构建工具，尝试从import.meta.env读取
  if (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    window.APP_CONFIG.OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || window.APP_CONFIG.OPENAI_API_KEY;
    window.APP_CONFIG.OPENAI_API_URL = import.meta.env.VITE_OPENAI_API_URL || window.APP_CONFIG.OPENAI_API_URL;
    window.APP_CONFIG.OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || window.APP_CONFIG.OPENAI_MODEL;
  }
})();

