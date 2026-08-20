const axios = require('axios');
const { loadLLMConfig, estimateCostCents, addBudgetSpend } = require('../middleware/rateLimit');
const { logUsage } = require('../models/Usage');

function buildEndpoint(baseUrl) {
  let url = (baseUrl || '').replace(/\/+$/, '');
  if (!url) throw new Error('未配置 LLM BASE URL');
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  if (/\/v1\/?$/.test(url)) return url.replace(/\/v1\/?$/, '/v1/chat/completions');
  // 兼容模式地址形如 compatible-mode/v1
  return `${url}/chat/completions`;
}

function isChatRequest(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
  );
}

function countTokens(text) {
  if (!text) return 0;
  // 简易估算：中文 1 字 1 token，英文 1/4 词 1 token，保守估计
  const len = String(text).length;
  return Math.max(1, Math.ceil(len * 0.8));
}

/**
 * 调用 LLM 接口（OpenAI 兼容协议）
 * @param {Array} messages
 * @param {Object} opts { temperature, response_format, modelOverride, user, device_id, endpoint }
 */
async function sendChatCompletion(messages, opts = {}) {
  if (!isChatRequest(messages)) throw new Error('messages 格式无效');
  const cfg = loadLLMConfig();
  const endpoint = buildEndpoint(cfg.baseUrl);
  const model = opts.modelOverride || cfg.model;
  if (!model) throw new Error('未配置模型名称');
  const body = {
    model,
    messages,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
    enable_search: true
  };
  if (opts.response_format) body.response_format = opts.response_format;
  const startedAt = Date.now();
  let durationMs = 0;
  try {
    const { data } = await axios.post(endpoint, body, {
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
    durationMs = Date.now() - startedAt;
    const content = data.choices?.[0]?.message?.content ?? '';
    const rawUsage = (data.usage || {}) || {};
    const usage = {
      prompt_tokens: rawUsage.prompt_tokens || countTokens(messages.map((m) => m.content).join('\n')),
      completion_tokens: rawUsage.completion_tokens || countTokens(content)
    };
    const cost = estimateCostCents(cfg, usage);
    addBudgetSpend(cost);
    setImmediate(() => {
      try {
        logUsage(opts.user?.id || 0, {
          endpoint: opts.endpoint || '/api/ai/chat',
          input_tokens: usage.prompt_tokens,
          output_tokens: usage.completion_tokens,
          model,
          cost_cents: cost,
          duration_ms: durationMs,
          device_id: opts.device_id || null
        });
      } catch (_e) {
        // ignore
      }
    });
    return {
      content,
      usage,
      cost_cents: cost,
      duration_ms: durationMs,
      model
    };
  } catch (err) {
    durationMs = Date.now() - startedAt;
    const message =
      err.response?.data?.message ||
      err.response?.data?.error?.message ||
      err.message ||
      'LLM 调用失败';
    const status = err.response?.status || 500;
    setImmediate(() => {
      try {
        logUsage(opts.user?.id || 0, {
          endpoint: opts.endpoint || '/api/ai/chat',
          model,
          device_id: opts.device_id || null,
          duration_ms: durationMs,
          error: String(message).slice(0, 500)
        });
      } catch (_e) {
        // ignore
      }
    });
    const out = new Error(message);
    out.status = status;
    out.raw = err.response?.data;
    throw out;
  }
}

module.exports = { sendChatCompletion, countTokens, buildEndpoint };
