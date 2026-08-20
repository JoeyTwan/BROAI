const plugin = requirePlugin('WechatSI')

function createVoice() {
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
      }
    })
  }

  return { startListening, stopListening, speak }
}

module.exports = { createVoice }
