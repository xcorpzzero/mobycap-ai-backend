const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const GROK_API_KEY = process.env.GROK_API_KEY;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, visitorId, email, page } = req.body;

    const prompt = `
You are MOBY, an AI sales assistant for MobyCap. You guide business owners through the funding process. Your job:
1. Ask one qualification question at a time.
2. Detect objections like: pricing concerns, already funded, trust issues.
3. Overcome objections with logic, case studies, or confident reframing.
4. Never give terms or funding amounts. When qualified, tell them you'll send a secure application link.
5. Always end with a question to keep the conversation going.
    `;

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-1.5',
        stream: false,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ]
      })
    });

    const result = await grokResponse.json();
    const reply = result.choices?.[0]?.message?.content || "Sorry, I didn’t understand that.";

    res.json({ message: reply });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`MobyCap AI backend running on port ${PORT}`);
});
