import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';

const QrCode: React.FC = () => {
  const [url, setUrl] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const base = window.location.origin + '/';
    setUrl(base);
    api.get('/api/admin/status').then(({ data }) => {
      setReady(!!data.setup?.ready);
    }).catch(() => setReady(false));
  }, []);

  function onDownload() {
    const svg = document.getElementById('bro-qr') as SVGSVGElement | null;
    if (!svg) return;
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([s], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '兄弟AI-扫码入口.svg';
    a.click();
  }

  async function onPrint() {
    window.print();
  }

  return (
    <div className="min-h-screen w-full px-5 py-10 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <a href="/admin" className="text-xs text-slate-400 hover:text-slate-200">← 返回管理员配置</a>
        <h1 className="mt-4 text-2xl md:text-4xl font-semibold tracking-tight">
          扫码就能用，不用输网址
        </h1>
        <p className="mt-3 text-slate-400 text-sm md:text-base">
          把这张图发到家庭群，或者打印出来贴冰箱。她拿微信扫一扫，直接就能跟兄弟AI唠。
        </p>

        <div className="mt-8 mx-auto bro-card rounded-3xl p-8 md:p-12 w-fit print:shadow-none">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl scene-gradient-travel flex items-center justify-center font-bold text-white text-xl shadow-lg">
              Bro
            </div>
            <div className="text-left">
              <div className="text-xs tracking-[0.3em] text-slate-400 uppercase">BroAI</div>
              <div className="text-xl font-semibold">兄弟 AI · 家里人专用</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl inline-block">
            <QRCodeSVG
              id="bro-qr"
              value={url || window.location.origin}
              size={260}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <div className="mt-5 text-base text-slate-200">
            打开微信 → 点右上角「+」 → 扫一扫
          </div>
          <div className="mt-1 text-sm text-slate-400 break-all">{url}</div>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${ready ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${ready ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {ready === null ? '检测系统状态…' : ready ? '系统已就绪，可以扫码使用' : '系统尚未配置，请先去 /admin 填 API Key'}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center print:hidden">
          <button onClick={onDownload} className="bro-btn rounded-xl px-5 py-2.5 bg-sky-500 hover:bg-sky-600 font-medium">下载 SVG</button>
          <button onClick={onPrint} className="bro-btn rounded-xl px-5 py-2.5 bg-slate-700 hover:bg-slate-600 font-medium">打印出来</button>
        </div>
        <div className="mt-10 text-xs text-slate-500 print:hidden">
          部署到公网之后，再访问本页面生成的二维码就是真实可扫的地址。
        </div>
      </div>
    </div>
  );
};

export default QrCode;
