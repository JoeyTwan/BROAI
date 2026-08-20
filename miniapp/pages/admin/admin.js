const api = require('../../utils/api')

const PRESETS = [
  {
    name: '阿里云百炼（推荐）',
    baseUrl: 'https://llm-da9pcbh2g3f45npf.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
    inputPrice: 0.0008,
    outputPrice: 0.002
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    inputPrice: 0.0007,
    outputPrice: 0.0014
  },
  {
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: '',
    inputPrice: 0.0005,
    outputPrice: 0.001
  }
]

Page({
  data: {
    loading: false,
    testing: false,
    ready: false,
    baseUrl: '',
    apiKey: '',
    model: '',
    inputPrice: 0.0008,
    outputPrice: 0.002,
    budgetCents: 300,
    deviceDayCap: 25,
    presets: PRESETS,
    activePreset: 0,
    adminToken: 'broai-admin-2025',
    testResult: ''
  },

  onLoad() {
    this.loadConfig()
  },

  async loadConfig() {
    try {
      const res = await api.get('/api/admin/status')
      const s = res.data.setup || {}
      this.setData({
        ready: s.ready,
        baseUrl: s.baseUrlHint || '',
        model: s.model || '',
        budgetCents: s.budgetCents || 300,
        deviceDayCap: s.deviceDayCap || 25
      })
    } catch {}
  },

  onPresetTap(e) {
    const idx = e.currentTarget.dataset.idx
    const p = PRESETS[idx]
    this.setData({
      activePreset: idx,
      baseUrl: p.baseUrl,
      model: p.model,
      inputPrice: p.inputPrice,
      outputPrice: p.outputPrice
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  async onTest() {
    if (this.data.testing) return
    this.setData({ testing: true, testResult: '' })
    try {
      const res = await api.post('/api/admin/test', {
        adminToken: this.data.adminToken,
        baseUrl: this.data.baseUrl,
        apiKey: this.data.apiKey,
        model: this.data.model
      })
      if (res.data.success) {
        this.setData({ testResult: '✅ 连通成功！' })
      } else {
        this.setData({ testResult: '❌ ' + (res.data.message || '连通失败') })
      }
    } catch (err) {
      this.setData({ testResult: '❌ ' + (err.errMsg || '网络错误') })
    }
    this.setData({ testing: false })
  },

  async onSave() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.post('/api/admin/config', {
        adminToken: this.data.adminToken,
        baseUrl: this.data.baseUrl,
        apiKey: this.data.apiKey,
        model: this.data.model,
        inputPrice: Number(this.data.inputPrice),
        outputPrice: Number(this.data.outputPrice),
        budgetCents: Number(this.data.budgetCents),
        deviceDayCap: Number(this.data.deviceDayCap)
      })
      if (res.data.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.loadConfig()
      } else {
        wx.showToast({ title: res.data.message || '保存失败', icon: 'none' })
      }
    } catch {
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
    this.setData({ loading: false })
  }
})
