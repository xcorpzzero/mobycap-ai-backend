// Load environment variables first
require('dotenv').config();

// Polyfill fetch (Node 18+ includes fetch, but this ensures cross-version support)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const express = require('express');
const mongoose = require('mongoose');

// Access environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

console.log('✅ MONGODB_URI loaded:', MONGODB_URI ? 'Found' : '❌ Not Found');
console.log('✅ XAI API Key loaded:', XAI_API_KEY ? 'Found' : '❌ Not Found');

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// POST /ask endpoint for Tidio
app.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log('🧪 Incoming Tidio request - XAI_API_KEY:', XAI_API_KEY ? 'Found' : 'Missing');

  if (!XAI_API_KEY) {
    return res.status(500).json({ error: 'XAI API key is not configured' });
  }

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: `You are Moby, the AI assistant for MobyCap.

Tone: Professional, clear, direct, supportive.

MobyCap Overview:
- Offers revenue-based funding between $50k–$5M.
- Serves businesses with over $1M in annual revenue.
- Targets manufacturing, healthcare, and media industries.
- Only funds companies with >1 year in business.

Mission: Provide capital with integrity, speed, and tailored strategy.

Examples:
Q: How fast can we get funding?
A: MobyCap typically funds within 1–3 business days after receiving complete documentation.

Q: Do you require collateral?
A: No. Our funding is revenue-based and doesn’t require fixed assets or personal guarantees.

Begin answering user queries below.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: 'XAI API error', details: errorData });
    }

    const data = await response.json();
    console.log('🔍 Full API response:', data);

    const answer = data.response || data.text || data.choices?.[0]?.message?.content;
    if (!answer) {
      return res.status(500).json({ error: 'Unexpected response format from XAI API', data });
    }

    // ✅ Tidio expects the key to be `reply`
    res.json({ reply: answer });

  } catch (err) {
    console.error('❌ API error:', err.message);
    res.status(500).json({ error: 'Failed to get response from XAI API' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 MobyCap AI backend running on port ${PORT}`);
});
