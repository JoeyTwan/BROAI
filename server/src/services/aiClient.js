import axios from 'axios';
import { config } from '../config.js';

export const callAI = async (messages) => {
  const body = {
    model: config.openAI.model,
    messages,
    stream: false
  };

  const { data } = await axios.post(config.openAI.url, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openAI.key}`
    },
    timeout: 60000
  });

  return data?.choices?.[0]?.message?.content ?? '';
};


