let plugin = null
try {
  plugin = requirePlugin('WechatSI')
} catch (e) {
  plugin = null
}

function createVoice() {
  if (!plugin) {
    return {
      supported: false,
      startListening() {
        wx.showToast({ title: '当前环境不支持语音输入，请打字', icon: 'none' })
      },
      stopListening() {},
      speak(text) {
        wx.showToast({ title: '当前环境不支持语音朗读', icon: 'none' })
      }
    }
  }

  const manager = plugin.getRecordRecognitionManager()
  let onResult = null
  let onEnd = null

  manager.onRecognize = (res) => {
    if (onResult && res.result) onResult(res.result)
  }
  manager.onStop = (res) => {
    if (onEnd && res.result) onEnd(res.result)
  }
  manager.onError = (err) => {
    console.error('语音识别错误', err)
  }

  function startListening(opts) {
    onResult = opts.onChange || null
    onEnd = opts.onFinal || null
    manager.start({ duration: 30000, lang: 'zh_CN' })
  }

  function stopListening() {
    manager.stop()
  }

  function speak(text) {
    plugin.textToSpeech({
      lang: 'zh_CN',
      tts: true,
      content: text,
      success(res) {
        const audio = wx.createInnerAudioContext()
        audio.src = res.filename
        audio.play()
      },
      fail(err) {
        console.error('语音合成失败', err)
        wx.showToast({ title: '语音合成失败', icon: 'none' })
      }
    })
  }

  return { supported: true, startListening, stopListening, speak }
}

module.exports = { createVoice }
