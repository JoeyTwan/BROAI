import { Conversation } from '../types';

export const SAMPLE_CONVERSATION: Conversation = {
  id: 'sample',
  title: '新能源市场调研示例',
  createdAt: Date.now() - 1000 * 60 * 60 * 12,
  messages: [
    { role: 'user', content: '要做份新能源充电桩市场调研，老板说明早九点前要初稿。' },
    {
      role: 'assistant',
      content: '先确认用途：是融资路演、政府汇报，还是内部投资评审？不同场景重点不同。'
    },
    { role: 'user', content: '内部投资评审，要决定要不要投一个华南的运营团队。' },
    {
      role: 'assistant',
      content: '明白，听众更关注财务回报还是战略布局？他们懂行业细节吗？'
    },
    { role: 'user', content: '懂业务，关心利润模型和政策补贴。' },
    {
      role: 'assistant',
      content: '呈现形式和风格呢？需要 PPT 大纲还是一页式 memo？要不要附带数据表格？'
    },
    {
      role: 'user',
      content: '给我 PPT 大纲，最好有中国 vs 欧洲对比，口吻实用一些但有结论。'
    },
    {
      role: 'assistant',
      content:
        '收到，我会输出：1) PPT 章节结构 2) 中欧数据对比 3) 投资逻辑与风险 4) 下一步调研建议。'
    }
  ]
};


