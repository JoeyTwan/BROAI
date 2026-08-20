const app = getApp()

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'X-Device-Id': app.globalData.deviceId
      },
      success(res) {
        resolve(res)
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

module.exports = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data)
}
