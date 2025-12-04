import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  openAI: {
    key: process.env.OPENAI_API_KEY,
    url: process.env.OPENAI_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: process.env.OPENAI_MODEL || 'qwen-plus'
  },
  usage: {
    dailyLimit: Number(process.env.DAILY_FREE_LIMIT || 100)
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};


