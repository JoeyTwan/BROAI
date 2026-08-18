const { getConfig, setConfig } = require('../config/database');
const { getBudget, touchDeviceLimit, addBudgetSpend } = require('../models/Usage');

const CONFIG_KEYS = {
  BASE_URL: 'llm.base_url',
  API_KEY: 'llm.api_key',
  MODEL: 'llm.model',
  INPUT_PRICE: 'llm.input_price_cny_per_1k',
  OUTPUT_PRICE: 'llm.output_price_cny_per_1k',
  BUDGET_CENTS: 'global.daily_budget_cny_cents',
  DEVICE_DAY_CAP: 'global.device_day_cap'
};

function defaultConfig() {
  return {
    baseUrl: process.env.LLM_BASE_URL || process.env.OPENAI_API_URL || '',
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.LLM_MODEL || process.env.OPENAI_MODEL || '',
    inputPrice: Number(process.env.LLM_INPUT_PRICE) || 0.0008,
    outputPrice: Number(process.env.LLM_OUTPUT_PRICE) || 0.002,
    budgetCents: Number(process.env.DAILY_BUDGET_CNY_CENTS) || 300,
    deviceDayCap: Number(process.env.DEVICE_DAY_MAX) || 25
  };
}

function loadLLMConfig() {
  const stored = getConfig(CONFIG_KEYS.BASE_URL, null);
  const d = defaultConfig();
  if (stored) {
    return {
      baseUrl: getConfig(CONFIG_KEYS.BASE_URL, d.baseUrl),
      apiKey: getConfig(CONFIG_KEYS.API_KEY, d.apiKey),
      model: getConfig(CONFIG_KEYS.MODEL, d.model),
      inputPrice: Number(getConfig(CONFIG_KEYS.INPUT_PRICE, d.inputPrice)),
      outputPrice: Number(getConfig(CONFIG_KEYS.OUTPUT_PRICE, d.outputPrice)),
      budgetCents: Number(getConfig(CONFIG_KEYS.BUDGET_CENTS, d.budgetCents)),
      deviceDayCap: Number(getConfig(CONFIG_KEYS.DEVICE_DAY_CAP, d.deviceDayCap))
    };
  }
  // 首次：把 env / 默认值写入 DB，便于后面 /admin 改。这里不递归。
  setConfig(CONFIG_KEYS.BASE_URL, d.baseUrl || '');
  setConfig(CONFIG_KEYS.API_KEY, d.apiKey || '');
  setConfig(CONFIG_KEYS.MODEL, d.model || '');
  setConfig(CONFIG_KEYS.INPUT_PRICE, Number(d.inputPrice) || 0);
  setConfig(CONFIG_KEYS.OUTPUT_PRICE, Number(d.outputPrice) || 0);
  setConfig(CONFIG_KEYS.BUDGET_CENTS, Number(d.budgetCents) || 0);
  setConfig(CONFIG_KEYS.DEVICE_DAY_CAP, Number(d.deviceDayCap) || 0);
  return d;
}

async function saveLLMConfig(cfg) {
  setConfig(CONFIG_KEYS.BASE_URL, cfg.baseUrl || '');
  setConfig(CONFIG_KEYS.API_KEY, cfg.apiKey || '');
  setConfig(CONFIG_KEYS.MODEL, cfg.model || '');
  setConfig(CONFIG_KEYS.INPUT_PRICE, Number(cfg.inputPrice) || 0);
  setConfig(CONFIG_KEYS.OUTPUT_PRICE, Number(cfg.outputPrice) || 0);
  setConfig(CONFIG_KEYS.BUDGET_CENTS, Number(cfg.budgetCents) || 0);
  setConfig(CONFIG_KEYS.DEVICE_DAY_CAP, Number(cfg.deviceDayCap) || 0);
  return loadLLMConfig();
}

function isSetupReady(cfg) {
  const c = cfg || loadLLMConfig();
  return !!(c && c.baseUrl && c.apiKey && c.model);
}

function requireSetup(req, res, next) {
  if (isSetupReady()) return next();
  res.status(503).json({
    success: false,
    error: 'SETUP_REQUIRED',
    message: '请管理员先访问 /admin 完成 API Key 配置'
  });
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return next(); // env 未设置则不强制
  const got =
    req.headers['x-admin-token'] ||
    (req.body && req.body.adminToken) ||
    (req.query && req.query.adminToken);
  if (expected && String(got) !== String(expected)) {
    return res.status(403).json({
      success: false,
      error: 'ADMIN_TOKEN_REQUIRED',
      message: '需要管理员令牌才能访问此接口'
    });
  }
  next();
}

function protectChat(req, res, next) {
  const cfg = loadLLMConfig();
  if (!isSetupReady(cfg)) {
    return res.status(503).json({
      success: false,
      error: 'SETUP_REQUIRED',
      message: '系统还没准备好，请让家人先配置一下 AI Key'
    });
  }
  // 全局预算
  const budget = getBudget();
  if (budget.spent_cents >= cfg.budgetCents) {
    return res.status(429).json({
      success: false,
      error: 'BUDGET_LOCKED',
      message: '今儿兄弟也累了，明天再来唠哈'
    });
  }
  // 设备级限流
  const deviceId = req.headers['x-device-id'] || 'unknown';
  const limit = touchDeviceLimit(deviceId);
  if (limit.overWindow) {
    return res.status(429).json({
      success: false,
      error: 'TOO_FAST',
      message: '哎呀说得太快啦，喝口水歇会儿再说'
    });
  }
  if (limit.overDay) {
    return res.status(429).json({
      success: false,
      error: 'DEVICE_DAY_LOCKED',
      message: '咱今天聊得够多啦，明天再唠好不好'
    });
  }
  req.llm = cfg;
  req.budget = budget;
  next();
}

function estimateCostCents(cfg, usage) {
  if (!cfg || !usage) return 0;
  const inK = (usage.prompt_tokens || usage.input_tokens || 0) / 1000;
  const outK = (usage.completion_tokens || usage.output_tokens || 0) / 1000;
  const yuan = inK * Number(cfg.inputPrice) + outK * Number(cfg.outputPrice);
  return Math.max(0, Math.round(yuan * 100)); // 分
}

module.exports = {
  CONFIG_KEYS,
  loadLLMConfig,
  saveLLMConfig,
  isSetupReady,
  requireSetup,
  requireAdmin,
  protectChat,
  estimateCostCents,
  addBudgetSpend
};
