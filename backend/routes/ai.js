const express = require('express');
const { authenticate } = require('../middleware/auth');
const { protectChat, loadLLMConfig } = require('../middleware/rateLimit');
const { sendChatCompletion } = require('../utils/openai');
const { saveConversationMessages, createConversation, updateConversation, getUserConversations } = require('../models/Conversation');

const router = express.Router();

const BASE_SYSTEM_PROMPT = `你是"兄弟AI"，一个专门帮家里长辈和不熟练用智能手机的人把模糊想法一步步捋清楚的唠嗑式AI助手。

行为准则（必须严格遵守）：
1. 语气永远像她的晚辈/大侄子：温暖、亲切、口语化，绝对不能说专业词、术语。
2. 一次只问一个问题，回复里只能出现一个中文问号"？"。不要用"还有""另外""同时"引出第二个问题。
3. 遇到用户答"不知道""随便""都行"，不要追问，按常识选一个默认值继续往下。
4. 不能让用户觉得"我又答错了"。她怎么答都对，永远夸她。
5. 信息捋清楚后，如果用户选择的场景最终要求输出JSON卡片，你必须输出符合场景结构的纯JSON对象（不要加其他文字），字段必须与被要求的 schema 完全一致。
6. 如果用户问你是谁，就答："我是你家里兄弟，不清楚咋开口不要紧，想到啥说啥就行，咱慢慢唠。"
`;

const SCENES = {
  travel: {
    name: '旅游攻略',
    questions: [
      '唠两句呀，想去哪儿玩呀？',
      '大概打算去几天呀？啥时候动身？',
      '跟谁一块儿去呀？有老人孩子不？',
      '大概准备花多少钱呀？省着点还是想造一下？',
      '有啥地方是你一直惦记着必须去的不？',
      '想去了之后咋出行呀？坐高铁、飞机还是自己开车都行。'
    ],
    finalPrompt: `把上面唠的这些信息整成一张给家里长辈看得懂的旅游攻略JSON卡片。
要求输出纯JSON对象，外层结构：
{
  "type": "travel",
  "title": "城市+天数+主题（如：厦门3天慢游）",
  "destination": "城市名",
  "days": 数字,
  "budgetText": "预算的人话描述",
  "totalBudgetCents": 数字(元换算为分),
  "tips": ["注意事项1","注意事项2"],
  "packingList": ["身份证","防晒霜"...],
  "dailyPlan": [
    { "day": "第1天", "title": "一句话主题",
      "morning": "早上做啥", "noon": "中午吃啥",
      "afternoon": "下午做啥", "evening": "晚上做啥",
      "tips": "当天小提醒" }
  ]
}
- 用词口语化，简短，每句不超16个字。
- "要带的东西"列表要具体，考虑长辈的实际需求（药、老花镜、帽子、舒适的鞋…）
- tips 必须红色加粗能一眼看到。
- days 和 totalBudgetCents 必须是数字。
- 除了JSON本身，不要输出任何别的内容，不要代码块，不要解释。`,
    card: 'travel'
  },
  recipe: {
    name: '家常菜谱',
    questions: [
      '想整个啥菜呀？有想吃的口味不？',
      '家里几口人吃呀？',
      '有没有啥忌口不吃的？（比如辣、海鲜、香菜…）',
      '家里有啥锅呀？炒锅/汤锅/空气炸锅都行。',
      '想整个简单快的呀，还是愿意慢慢炖？',
      '家里有没有现成的菜想先处理掉？'
    ],
    finalPrompt: `输出家常菜谱JSON卡片，纯JSON，不要别的内容：
{
  "type": "recipe",
  "title": "菜名（如：番茄炒蛋）",
  "serving": "几人份",
  "difficulty": "简单/中等/麻烦点",
  "timeMinutes": 数字,
  "ingredients": [
    { "name": "番茄", "amount": "2个" }
  ],
  "tools": ["炒锅","铲子"],
  "steps": [
    { "order": 1, "title": "备菜", "detail": "番茄切块鸡蛋打散", "timeMinutes": 数字 }
  ],
  "tips": ["新手提示1","新手提示2"]
}
每一步都要写清楚放多少量，写具体，不要"适量"这种词。`,
    card: 'recipe'
  },
  letter: {
    name: '给小辈写信',
    questions: [
      '这是写给谁的呀？孩子、孙子、还是老朋友？',
      '主要想跟他/她唠点啥事儿呀？',
      '想整得语重心长一点的，还是轻松点像聊天？',
      '最后想叮嘱他/她点啥不？（身体、工作、学习…）',
      '想让他/她有空回来看看不？',
      '落款想写啥呀？（妈妈/奶奶/你的名字…）'
    ],
    finalPrompt: `输出一封给长辈用的信的JSON卡片，纯JSON：
{
  "type": "letter",
  "title": "给XXX的一封信",
  "recipient": "收件人称呼",
  "greeting": "开头称呼（如：我最亲爱的大孙子）",
  "paragraphs": [
    "第一段：开场白，最近家里的小事",
    "第二段：想表达的正事/心事",
    "第三段：叮嘱/期盼"
  ],
  "endingSpoken": "照着念的口语版结束语（简短、断句自然、带停顿逗号）",
  "signature": "落款（妈妈/奶奶…）",
  "wechatText": "可以直接复制到微信长消息发出去的完整文本，不用加格式符号"
}
所有段落口语化，不能文绉绉。wechatText 里要真实完整，不要 markdown。`,
    card: 'letter'
  }
};

function detectScene(text) {
  const t = String(text || '');
  if (/旅|游|玩|出去|厦门|北京|成都|三亚|攻略|景点|高铁|飞机/.test(t)) return 'travel';
  if (/菜|饭|吃|炒|炖|煮|菜谱|面|汤/.test(t)) return 'recipe';
  if (/信|写|说|叮嘱|孩子|孙子|孙女|朋友|想你|联系/.test(t)) return 'letter';
  return null;
}

function systemPromptWithContext(sceneKey) {
  const scene = sceneKey ? SCENES[sceneKey] : null;
  if (!scene) return BASE_SYSTEM_PROMPT;
  return (
    BASE_SYSTEM_PROMPT +
    `\n当前场景：${scene.name}。\n追问顺序（严格按此顺序，一次只问一个，跳过已经明确回答过的）：\n` +
    scene.questions.map((q, i) => `${i + 1}. ${q}`).join('\n') +
    `\n当上述信息足够后（用户答"可以了""开始吧"，或你认为 6 个问题里答了 4+ 就够用了），不要再追问，用如下指令生成最终结果：\n${scene.finalPrompt}`
  );
}

function buildMessages({ system, history, userText, scene }) {
  const list = [{ role: 'system', content: system || systemPromptWithContext(scene) }];
  (history || []).forEach((m) => {
    if (m.role === 'system') return;
    list.push({ role: m.role, content: m.content });
  });
  list.push({ role: 'user', content: userText });
  return list;
}

function tryParseCard(text) {
  if (!text) return null;
  try {
    // 去掉可能的 ```json ... ``` 代码块
    const cleaned = String(text)
      .replace(/^\s*```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === 'object') return obj;
  } catch (_e) {
    // fallback: 找最外层 { ... }
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (__e) {
        return null;
      }
    }
  }
  return null;
}

// 决策：是否应该进入"最终输出JSON卡片"的模式
function decideFinalMode({ history, scene, userText }) {
  if (!scene || !SCENES[scene]) return { final: false };
  const userTurns = (history || []).filter((m) => m.role === 'user');
  const short = /可以|开始|够了|行了|就这样|直接|快点|出/.test(userText || '');
  if (short && userTurns.length >= 3) return { final: true, forceJson: true };
  if (userTurns.length >= 7) return { final: true, forceJson: true };
  return { final: false };
}

router.post('/chat', authenticate, protectChat, async (req, res) => {
  // 新老接口双模式：
  //  - 新前端：{ message: "…", conversation_id?, scene_hint?, pending_clarification? }
  //  - 旧前端 / 外部调用：{ messages: [...], scene?, conversationId? }
  const body = req.body || {};
  const legacy = Array.isArray(body.messages);

  let history = [];     // {role,content}[] 不含system
  let userText = '';
  let sceneHint = '';
  let convId = '';
  let createNewConv = false;

  if (legacy) {
    const messages = body.messages;
    if (!messages.length) {
      return res.status(400).json({ success: false, error: 'INVALID', message: '消息不能为空' });
    }
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    userText = lastUser ? lastUser.content : '';
    sceneHint = body.scene || '';
    convId = body.conversationId || '';
    history = messages.filter((m) => m.role !== 'system');
  } else {
    const raw = String(body.message || '').trim();
    if (!raw) {
      return res.status(400).json({ success: false, error: 'INVALID', message: '消息不能为空' });
    }
    userText = raw;
    sceneHint = body.scene_hint || '';
    convId = body.conversation_id || '';
    if (!convId) createNewConv = true;
    // 如果带了 conversation_id，先把之前的历史拉出来
    if (convId) {
      try {
        const list = await getUserConversations(req.user.id);
        const c = list.find((x) => x.id === convId);
        if (c) {
          sceneHint = sceneHint || c.scene || '';
          history = (c.messages || []).map((m) => ({ role: m.role, content: m.content }));
        }
      } catch {}
    }
    // 处理 pending_clarification：给最近一条 assistant 追加一段上下文，避免跑题
    if (body.pending_clarification?.clarification_id && history.length) {
      // no-op，当前实现走的是自然对话历史即可
    }
  }

  const detectedScene = sceneHint || detectScene(userText);
  const finalDecision = decideFinalMode({ history, scene: detectedScene, userText });
  let system = systemPromptWithContext(detectedScene);
  if (finalDecision.final && SCENES[detectedScene]) {
    system +=
      '\n\n【重要】现在信息已经足够，你必须输出最终结果，不要再追问。按之前给出的最终JSON schema输出纯JSON对象，不要追问，不要解释。';
  }

  const payloadMessages = buildMessages({ system, history, userText, scene: detectedScene });
  const started = Date.now();

  // 会话：即使 LLM 失败也创建一条（方便回头接着唠），所以放在 try 外
  let realConvId = convId;
  let title = '';
  if (createNewConv) {
    const t = (userText || '新对话').slice(0, 18) || '新对话';
    const created = createConversation(req.user.id, t, undefined, detectedScene || null);
    realConvId = created.id;
    title = t;
  }

  try {
    const opts = {
      temperature: finalDecision.final ? 0.3 : 0.8,
      user: req.user,
      device_id: req.user.device_id,
      endpoint: '/api/ai/chat',
      response_format: finalDecision.final ? { type: 'json_object' } : undefined
    };
    const result = await sendChatCompletion(payloadMessages, opts);
    const rawContent = result.content || '';
    const card = tryParseCard(rawContent);
    const nextHistory = [
      ...history,
      { role: 'user', content: userText },
      { role: 'assistant', content: rawContent, card }
    ];

    if (realConvId) {
      try {
        saveConversationMessages(realConvId, req.user.id, nextHistory);
        updateConversation(realConvId, req.user.id, {
          scene: detectedScene,
          title:
            history.length === 0
              ? (userText || '').slice(0, 18) || '新对话'
              : undefined
        });
        if (!title) title = (userText || '新对话').slice(0, 18) || '新对话';
      } catch (_e) {
        console.warn('保存消息失败', _e.message);
      }
    }

    const base = {
      success: true,
      reply: rawContent,
      card,
      scene: detectedScene,
      final: !!(card && finalDecision.final),
      conversation_id: realConvId,
      title,
      pending_clarification: (card || finalDecision.final)
        ? null
        : { conversation_id: realConvId, clarification_id: 'c_' + Date.now().toString(36) },
      usage: {
        cost_cents: result.cost_cents,
        input_tokens: result.usage?.prompt_tokens || result.usage?.input_tokens || 0,
        output_tokens: result.usage?.completion_tokens || result.usage?.output_tokens || 0,
        duration_ms: Date.now() - started
      }
    };
    base.data = rawContent;
    res.json(base);
  } catch (err) {
    console.error('[ai/chat]', err.message, err.status);
    if (realConvId) {
      try {
        const list = await getUserConversations(req.user.id);
        const c = list.find((x) => x.id === realConvId);
        const msgs = ((c && c.messages) || []).slice().map((m) => ({ role: m.role, content: m.content }));
        const has = msgs.some((m) => m.role === 'user' && m.content === userText);
        if (!has) {
          msgs.push({ role: 'user', content: userText });
          saveConversationMessages(realConvId, req.user.id, msgs);
        }
      } catch (_e) {
        console.warn('失败时兜底保存用户消息失败', _e.message);
      }
    }
    res.status(err.status || 502).json({
      success: false,
      error: 'AI_FAILED',
      message: process.env.NODE_ENV === 'development' ? err.message : '兄弟这会儿卡壳了，待会儿再试试',
      conversation_id: realConvId
    });
  }
});

// 「简单点/详细点」按钮：用现有 card 或历史消息 + 一个简单指令重出
router.post('/refine', authenticate, protectChat, async (req, res) => {
  const { conversationId, mode } = req.body || {};
  if (!conversationId || !mode) {
    return res.status(400).json({ success: false, error: 'INVALID' });
  }
  try {
    const list = await require('../models/Conversation').getUserConversations(req.user.id);
    const conv = list.find((c) => c.id === conversationId);
    if (!conv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const scene = conv.scene || detectScene((conv.title || '') + (conv.messages?.[0]?.content || ''));
    if (!scene || !SCENES[scene]) {
      return res.status(400).json({ success: false, error: 'NO_SCENE', message: '这个内容没法调粗细' });
    }
    const tail = mode === 'light' ? '给我改得简单点，骨架就行，少写点' : '给我写详细点，多点小提示';
    const history = conv.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const payload = buildMessages({ system: systemPromptWithContext(scene), history, userText: tail, scene });
    const result = await sendChatCompletion(payload, {
      temperature: 0.4,
      user: req.user,
      device_id: req.user.device_id,
      endpoint: '/api/ai/refine',
      response_format: { type: 'json_object' }
    });
    const card = tryParseCard(result.content) || null;
    saveConversationMessages(conversationId, req.user.id, [
      ...conv.messages,
      { role: 'user', content: mode === 'light' ? '给我弄简单点' : '给我写详细点' },
      { role: 'assistant', content: result.content || '', card }
    ]);
    res.json({ success: true, data: result.content || '', card, scene, final: !!card });
  } catch (err) {
    console.error('[ai/refine]', err);
    res.status(err.status || 500).json({ success: false, error: 'REFINE_FAILED', message: err.message });
  }
});

router.get('/scenes', (_req, res) => {
  const out = Object.entries(SCENES).map(([key, s]) => ({
    key,
    name: s.name,
    questions: s.questions
  }));
  res.json({ success: true, data: out });
});

module.exports = router;
