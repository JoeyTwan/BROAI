const api = require('../../utils/api')
const { createVoice } = require('../../utils/voice')

Page({
  data: {
    messages: [],
    input: '',
    loading: false,
    setupReady: false,
    listening: false,
    activeScene: '',
    scrollToView: '',
    voiceSupported: true,
    scenes: [
      { key: 'travel', name: '做个行程', emoji: '🧳', desc: '去哪玩、几天、花多少钱', cls: 'scene-travel' },
      { key: 'recipe', name: '做个菜谱', emoji: '🍲', desc: '家里有啥，我教你做', cls: 'scene-recipe' },
      { key: 'letter', name: '写个信', emoji: '💌', desc: '给孩子、孙女写几句话', cls: 'scene-letter' }
    ],
    chips: [
      '周末想带孙子去趟近郊，推荐点地方呗',
      '我冰箱里有鸡蛋、西红柿、青椒，能做啥',
      '给我女儿发段话，让她别总熬夜'
    ]
  },

  voice: null,

  onLoad() {
    this.voice = createVoice()
    this.setData({ voiceSupported: !!this.voice.supported })
    this.checkSetup()
  },

  async checkSetup() {
    try {
      const res = await api.get('/health')
      this.setData({ setupReady: res.data.setupReady })
    } catch {}
  },

  onSceneTap(e) {
    const key = e.currentTarget.dataset.key
    const defaults = {
      travel: '我想出去玩几天，帮我出个计划。',
      recipe: '我想做个家常菜，家里人都爱吃的那种。',
      letter: '我想给我儿子写几句话，告诉他注意身体。'
    }
    this.setData({ activeScene: key })
    this.sendMessage(defaults[key], key)
  },

  onChipTap(e) {
    this.sendMessage(e.currentTarget.dataset.text)
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  async onSend() {
    const text = this.data.input.trim()
    if (!text || this.data.loading) return
    this.setData({ input: '' })
    this.sendMessage(text)
  },

  async sendMessage(text, sceneHint) {
    if (this.data.loading) return
    this.setData({ loading: true })
    const userMsg = { role: 'user', content: text }
    const messages = [...this.data.messages, userMsg]
    this.setData({ messages })
    this.scrollToBottom()

    try {
      const res = await api.post('/api/ai/chat', {
        message: text,
        scene_hint: sceneHint || this.data.activeScene || undefined
      })
      if (res.data.success) {
        const assistantMsg = {
          role: 'assistant',
          content: res.data.reply || '',
          card: res.data.card || null
        }
        this.setData({
          messages: [...this.data.messages, assistantMsg],
          loading: false
        })
        this.scrollToBottom()
      } else {
        wx.showToast({ title: res.data.message || '出了点小问题', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch {
      wx.showToast({ title: '网络不太好，待会儿再试', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onMicTap() {
    if (this.data.listening) {
      this.voice.stopListening()
      this.setData({ listening: false })
      return
    }
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ listening: true })
        this.voice.startListening({
          onChange: (text) => this.setData({ input: text }),
          onFinal: (text) => this.setData({ listening: false, input: text })
        })
      },
      fail: () => wx.showToast({ title: '需要录音权限才能说话', icon: 'none' })
    })
  },

  onSpeakTap() {
    const msgs = this.data.messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && msgs[i].content) {
        this.voice.speak(msgs[i].content)
        return
      }
    }
  },

  onCopyText(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text })
  },

  scrollToBottom() {
    setTimeout(() => this.setData({ scrollToView: 'msg-bottom' }), 100)
  },

  onShareAppMessage() {
    return {
      title: '省心聊 · 想到啥就说啥',
      path: '/pages/index/index'
    }
  }
})
