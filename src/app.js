const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Chatbot } = require('./chatbot');

/** Builds the Express app (exported separately so tests can use supertest). */
function createApp({ bot = new Chatbot() } = {}) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.post('/api/chat', (req, res) => {
    const { message, sessionId } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message (non-empty string) is required' });
    }
    if (message.length > 500) return res.status(413).json({ error: 'message is too long (max 500 characters)' });
    const sid = typeof sessionId === 'string' && sessionId.length <= 64 ? sessionId : crypto.randomUUID();
    const result = bot.reply(message, sid);
    return res.json({ sessionId: sid, ...result, name: bot.memory.get(sid).name });
  });

  app.delete('/api/session/:id', (req, res) => {
    bot.memory.reset(req.params.id);
    res.status(204).end();
  });

  app.get('/api/intents', (req, res) => {
    res.json({ count: bot.intents.length, tags: bot.intents.map((i) => i.tag) });
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', sessions: bot.memory.size }));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

module.exports = { createApp };
