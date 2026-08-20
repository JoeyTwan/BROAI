import React, { useEffect, useState } from 'react';
import { api, getAdminToken, setAdminToken } from '../api/client';

interface LLMConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyMasked?: string;
  model: string;
  inputPrice: number;
  outputPrice: number;
  budgetCents: number;
  deviceDayCap: number;
}

const PRESETS = [
  {
    name: '阿里云百炼（兼容模式，推荐）',
    baseUrl:
      'https://llm-da9pcbh2g3f45npf.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
    inputPrice: 0.0008,
    outputPrice: 0.002
  },
  {
    name: '阿里 DashScope 通用兼容',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
    inputPrice: 0.0008,
    outputPrice: 0.002
  },
  {
    name: 'DeepSeek（兼容）',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    inputPrice: 0.0007,
    outputPrice: 0.0014
  },
  {
    name: 'SiliconFlow / 其他 OpenAI 兼容',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: '',
    inputPrice: 0.0005,
    outputPrice: 0.001
  }
];

const AdminSetup: React.FC = () => {
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState(getAdminToken());
  const [adminError, setAdminError] = useState<string>('');
  const [cfg, setCfg] = useState<LLMConfig>({
    baseUrl: '',
    model: '',
    inputPrice: 0.0008,
    outputPrice: 0.002,
    budgetCents: 300,
    deviceDayCap: 25
  });
  const [apiKeyInput, setApiKeyInput] = useState('');

  async function loadStatus() {
    try {
      const { data } = await api.get('/api/admin/status');
      setReady(data.setup?.ready ?? false);
      if (data.setup) {
        setCfg((c) => ({
          ...c,
          baseUrl: data.setup.baseUrlSet ? c.baseUrl : c.baseUrl,
          model: data.setup.model || c.model,
          budgetCents: data.setup.budgetCents ?? c.budgetCents,
          deviceDayCap: data.setup.deviceDayCap ?? c.deviceDayCap
        }));
      }
      const res = await api.get('/api/admin/config');
      if (res.data.success) {
        const rc = res.data.config;
        setCfg({
          baseUrl: rc.baseUrl || '',
          apiKeyMasked: rc.apiKeyMasked || '',
          model: rc.model || '',
          inputPrice: Number(rc.inputPrice) || 0,
          outputPrice: Number(rc.outputPrice) || 0,
          budgetCents: Number(rc.budgetCents) || 0,
          deviceDayCap: Number(rc.deviceDayCap) || 0
        });
      }
    } catch (e: any) {
      if (e.response?.status === 403) {
        setAdminError('请先填入正确的 ADMIN_TOKEN（与后端 .env 里的 ADMIN_TOKEN 一致）');
      }
      console.warn(e);
    }
  }

  useEffect(() => {
    setAdminError('');
    if (adminTokenInput) setAdminToken(adminTokenInput);
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTokenInput]);

  async function onSave() {
    setLoading(true);
    setSaved(false);
    setTestMsg(null);
    try {
      const body = {
        ...cfg,
        apiKey: apiKeyInput || undefined,
        adminToken: adminTokenInput || undefined
      };
      const { data } = await api.post('/api/admin/config', body);
      if (data.success) {
        setSaved(true);
        setReady(data.config.ready);
        setCfg((c) => ({ ...c, ...data.config }));
        setApiKeyInput('');
        setTimeout(() => setSaved(false), 2200);
      }
    } catch (e: any) {
      setTestMsg({
        ok: false,
        msg:
          e.response?.data?.message ||
          e.response?.data?.error ||
          e.message ||
          '保存失败'
      });
      if (e.response?.status === 403) setAdminError('ADMIN_TOKEN 不匹配');
    } finally {
      setLoading(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const { data } = await api.post('/api/admin/test', {
        adminToken: adminTokenInput || undefined
      });
      setTestMsg({ ok: true, msg: `连通成功：${data.sample || ''}（消耗 ${data.cost_cents || 0} 分）` });
    } catch (e: any) {
      setTestMsg({
        ok: false,
        msg: e.response?.data?.message || e.message || '连通失败'
      });
    } finally {
      setTesting(false);
    }
  }

  function applyPreset(i: number) {
    const p = PRESETS[i];
    setCfg((c) => ({
      ...c,
      baseUrl: p.baseUrl,
      model: p.model,
      inputPrice: p.inputPrice,
      outputPrice: p.outputPrice
    }));
  }

  return (
    <div className="min-h-screen w-full px-5 py-10 md:px-10 md:py-14 scrollbar-thin">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">省心聊 · 管理员配置</h1>
            <p className="mt-2 text-slate-400 text-sm">
              在这里填入你自己的 API Key。填完点「连通测试」，确认没问题再保存。
              <span className="ml-2 inline-flex items-center gap-2">
                系统状态：
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    ready === null ? 'bg-slate-400' : ready ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                {ready === null ? '检测中…' : ready ? '已就绪' : '未配置'}
              </span>
            </p>
          </div>
          <a
            href="/"
            className="bro-btn rounded-xl px-4 py-2 text-sm bg-slate-700/60 hover:bg-slate-700"
          >
            ← 返回首页
          </a>
        </header>

        <section className="bro-card rounded-2xl p-5 md:p-7 mb-6">
          <h2 className="text-lg font-semibold mb-3">① 管理员鉴权</h2>
          <p className="text-sm text-slate-400 mb-4">
            如果你在后端 <code className="text-amber-300">.env</code> 里设置了{' '}
            <code className="text-amber-300">ADMIN_TOKEN</code>，这里要填同一个值才能保存。
            没设置的话可以留空。
          </p>
          <input
            type="password"
            value={adminTokenInput}
            onChange={(e) => setAdminTokenInput(e.target.value)}
            placeholder="ADMIN_TOKEN（没有就留空）"
            className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
          />
          {adminError && (
            <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-sm text-rose-200">
              {adminError}
            </div>
          )}
        </section>

        <section className="bro-card rounded-2xl p-5 md:p-7 mb-6">
          <h2 className="text-lg font-semibold mb-3">② 选个模板快速填充</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => applyPreset(i)}
                className="bro-btn text-left rounded-xl border border-slate-700 hover:border-sky-500/70 bg-slate-900/40 p-4"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">默认模型：{p.model || '(你自己填)'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="bro-card rounded-2xl p-5 md:p-7 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">③ LLM 接口（OpenAI 兼容协议）</h2>

          <div>
            <label className="text-sm text-slate-300">BASE URL</label>
            <input
              type="text"
              value={cfg.baseUrl}
              onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
              placeholder="https://xxx/compatible-mode/v1"
              className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">模型名称 (model)</label>
              <input
                type="text"
                value={cfg.model}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
                placeholder="例如：qwen-plus"
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">
                API Key {cfg.apiKeyMasked ? `（当前已存：${cfg.apiKeyMasked}）` : ''}
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={cfg.apiKeyMasked ? '留空则不修改 Key' : 'sk-xxxxxx'}
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-slate-300">输入单价 (元/1K tokens)</label>
              <input
                type="number"
                step="0.0001"
                value={cfg.inputPrice}
                onChange={(e) => setCfg({ ...cfg, inputPrice: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">输出单价 (元/1K tokens)</label>
              <input
                type="number"
                step="0.0001"
                value={cfg.outputPrice}
                onChange={(e) => setCfg({ ...cfg, outputPrice: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">单日总预算（元）</label>
              <input
                type="number"
                step="0.01"
                value={(cfg.budgetCents / 100 || 0).toFixed(2)}
                onChange={(e) => setCfg({ ...cfg, budgetCents: Math.round(Number(e.target.value) * 100) })}
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">单设备单日次数上限</label>
              <input
                type="number"
                value={cfg.deviceDayCap}
                onChange={(e) => setCfg({ ...cfg, deviceDayCap: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl bg-slate-900/60 border border-slate-700 px-4 py-2.5 outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </section>

        <section className="bro-card rounded-2xl p-5 md:p-7 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onSave}
              disabled={loading}
              className="bro-btn rounded-xl px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-sm font-semibold"
            >
              {loading ? '保存中…' : '保存配置'}
            </button>
            <button
              onClick={onTest}
              disabled={testing || !ready}
              className="bro-btn rounded-xl px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-sm font-semibold"
            >
              {testing ? '测试中…' : '连通测试（发一条 ping）'}
            </button>
            <a href="/qrcode" className="ml-auto bro-btn rounded-xl px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-sm">
              📱 生成分享二维码
            </a>
            {saved && (
              <span className="inline-flex items-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 text-emerald-200 text-sm">
                ✓ 已保存
              </span>
            )}
          </div>
          {testMsg && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                testMsg.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
              }`}
            >
              {testMsg.msg}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            配置会加密保存在服务器上的 SQLite 数据库里。数据量很小，完全不占资源。
          </p>
        </section>
      </div>
    </div>
  );
};

export default AdminSetup;
