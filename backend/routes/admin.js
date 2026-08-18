const express = require('express');
const {
  loadLLMConfig,
  saveLLMConfig,
  isSetupReady,
  requireAdmin
} = require('../middleware/rateLimit');
const { sendChatCompletion, buildEndpoint } = require('../utils/openai');
const { getBudgetStats, getBudget, setBudgetCap } = require('../models/Usage');
const { listUsers } = require('../models/User');

const router = express.Router();

// 公开接口：返回是否已经完成配置（前端决定是否跳 /admin）
router.get('/status', (_req, res) => {
  const cfg = loadLLMConfig();
  const budget = getBudget();
  res.json({
    success: true,
    setup: {
      ready: isSetupReady(cfg),
      baseUrlSet: !!cfg.baseUrl,
      apiKeySet: !!cfg.apiKey,
      modelSet: !!cfg.model,
      model: cfg.model || '',
      baseUrlHint: (cfg.baseUrl || '').replace(/[^/]{10,}/, (s) => '*'.repeat(Math.min(20, s.length))),
      budgetCents: cfg.budgetCents,
      deviceDayCap: cfg.deviceDayCap,
      dailyBudget: budget
    }
  });
});

// 获取完整配置（敏感信息 apiKey 只回后 4 位）
router.get('/config', requireAdmin, (_req, res) => {
  const cfg = loadLLMConfig();
  const mask = (s) => (s && s.length > 4 ? `****${s.slice(-4)}` : s ? '****' : '');
  res.json({
    success: true,
    config: {
      baseUrl: cfg.baseUrl,
      apiKeyMasked: mask(cfg.apiKey),
      model: cfg.model,
      inputPrice: cfg.inputPrice,
      outputPrice: cfg.outputPrice,
      budgetCents: cfg.budgetCents,
      deviceDayCap: cfg.deviceDayCap,
      adminTokenSet: !!process.env.ADMIN_TOKEN
    }
  });
});

// 保存配置
router.post('/config', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const current = loadLLMConfig();
  const incoming = {
    baseUrl: typeof b.baseUrl === 'string' ? b.baseUrl.trim() : current.baseUrl,
    apiKey:
      typeof b.apiKey === 'string' && b.apiKey.trim() && !b.apiKey.startsWith('****')
        ? b.apiKey.trim()
        : current.apiKey,
    model: typeof b.model === 'string' ? b.model.trim() : current.model,
    inputPrice: b.inputPrice !== undefined ? Number(b.inputPrice) : current.inputPrice,
    outputPrice: b.outputPrice !== undefined ? Number(b.outputPrice) : current.outputPrice,
    budgetCents: b.budgetCents !== undefined ? Number(b.budgetCents) : current.budgetCents,
    deviceDayCap: b.deviceDayCap !== undefined ? Number(b.deviceDayCap) : current.deviceDayCap
  };
  if (!incoming.baseUrl) {
    return res.status(400).json({ success: false, error: 'BASE_URL_REQUIRED', message: 'BASE URL 不能为空' });
  }
  if (!incoming.apiKey) {
    return res.status(400).json({ success: false, error: 'API_KEY_REQUIRED', message: 'API Key 不能为空' });
  }
  if (!incoming.model) {
    return res.status(400).json({ success: false, error: 'MODEL_REQUIRED', message: '模型名称不能为空' });
  }
  try {
    buildEndpoint(incoming.baseUrl);
  } catch (e) {
    return res.status(400).json({ success: false, error: 'BASE_URL_INVALID', message: e.message });
  }
  const saved = await saveLLMConfig(incoming);
  if (b.budgetCents !== undefined) {
    try { setBudgetCap(Number(b.budgetCents)); } catch (_e) { /* ignore */ }
  }
  res.json({
    success: true,
    message: '配置已保存',
    config: {
      baseUrl: saved.baseUrl,
      model: saved.model,
      inputPrice: saved.inputPrice,
      outputPrice: saved.outputPrice,
      budgetCents: saved.budgetCents,
      deviceDayCap: saved.deviceDayCap,
      ready: isSetupReady(saved)
    }
  });
});

// 连通性测试：用当前配置发一个简短的 ping 消息
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const r = await sendChatCompletion(
      [{ role: 'user', content: '请只回复一个"好"字，不要任何标点。' }],
      { endpoint: '/api/admin/test', temperature: 0 }
    );
    res.json({ success: true, message: '连通成功', sample: (r.content || '').slice(0, 32), usage: r.usage, cost_cents: r.cost_cents });
  } catch (err) {
    res.status(400).json({ success: false, error: 'TEST_FAILED', message: err.message, raw: err.raw });
  }
});

// 数据面板（仅管理员）
router.get('/dashboard', requireAdmin, (req, res) => {
  const stats = getBudgetStats(14);
  const users = listUsers(50);
  res.json({ success: true, stats, users });
});

module.exports = router;
