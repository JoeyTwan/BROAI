const axios = require('axios');

async function sendChatCompletion(messages) {
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages,
    temperature: 0.7
  };

  const { data } = await axios.post(
    process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
    body,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );
  return data.choices[0]?.message?.content ?? '';
}

module.exports = { sendChatCompletion };


