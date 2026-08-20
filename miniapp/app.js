App({
  globalData: {
    // 部署时改成你的 HTTPS 域名，如 https://api.shengxinliao.com
    // 开发阶段用 localhost，微信开发者工具里勾选「不校验合法域名」
    apiBase: 'http://localhost:4000',
    deviceId: ''
  },
  onLaunch() {
    let id = wx.getStorageSync('deviceId')
    if (!id) {
      id = 'wx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      wx.setStorageSync('deviceId', id)
    }
    this.globalData.deviceId = id
  }
})
