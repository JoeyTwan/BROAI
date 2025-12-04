/**
 * API连接测试工具
 * 用于诊断网络连接问题
 */

import { api } from '../api/client';

export const testApiConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    // 测试健康检查端点
    const response = await fetch(`${baseURL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        message: `服务器返回错误: ${response.status} ${response.statusText}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'API连接正常',
      details: data
    };
  } catch (error: any) {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    if (error.message?.includes('fetch')) {
      return {
        success: false,
        message: `无法连接到服务器 ${baseURL}\n\n可能的原因：\n1. 后端服务未启动\n2. 后端服务运行在不同的端口\n3. 网络连接问题\n4. CORS配置问题`,
        details: { error: error.message, baseURL }
      };
    }

    return {
      success: false,
      message: `连接测试失败: ${error.message}`,
      details: { error: error.message }
    };
  }
};


