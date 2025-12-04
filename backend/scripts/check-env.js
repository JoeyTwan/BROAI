#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 在部署前运行此脚本确保所有必需的环境变量都已设置
 */

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'CLIENT_URL'
];

const optionalEnvVars = [
  'OPENAI_API_URL',
  'OPENAI_MODEL',
  'DAILY_LIMIT',
  'PORT',
  'NODE_ENV',
  'ENABLE_SCHEDULER'
];

console.log('🔍 检查环境变量配置...\n');

let hasError = false;
const missing = [];
const present = [];

// 检查必需变量
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missing.push(varName);
    hasError = true;
  } else {
    present.push(varName);
  }
});

// 显示结果
if (present.length > 0) {
  console.log('✅ 已配置的必需变量:');
  present.forEach(varName => {
    const value = process.env[varName];
    // 敏感信息只显示前4个字符
    const displayValue = varName.includes('SECRET') || varName.includes('KEY')
      ? value.substring(0, 4) + '***'
      : value;
    console.log(`   ${varName}: ${displayValue}`);
  });
  console.log('');
}

if (missing.length > 0) {
  console.log('❌ 缺失的必需变量:');
  missing.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

// 显示可选变量
const configuredOptional = optionalEnvVars.filter(varName => process.env[varName]);
if (configuredOptional.length > 0) {
  console.log('ℹ️  已配置的可选变量:');
  configuredOptional.forEach(varName => {
    console.log(`   ${varName}: ${process.env[varName]}`);
  });
  console.log('');
}

// 退出
if (hasError) {
  console.log('❌ 环境变量检查失败！请设置所有必需的环境变量。');
  console.log('\n提示：');
  console.log('1. 复制 env.template 为 .env');
  console.log('2. 填写所有必需的环境变量');
  console.log('3. 在部署平台（Railway/Render）中设置环境变量');
  process.exit(1);
} else {
  console.log('✅ 所有必需的环境变量都已配置！');
  process.exit(0);
}


