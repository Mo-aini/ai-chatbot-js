const request = require('supertest');
const { createApp } = require('../src/app');
const { Chatbot } = require('../src/chatbot');

describe('REST API', () => {
  const app = createApp({ bot: new Chatbot({ random: () => 0 }) });

  test('POST /api/chat answers and returns a session id', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'library hours' });
    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('library_hours');
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.reply).toMatch(/8:00 AM/);
  });

  test('session id keeps memory between requests', async () => {
    const first = await request(app).post('/api/chat').send({ message: 'my name is Sana' });
    const second = await request(app).post('/api/chat').send({ message: 'what is my name', sessionId: first.body.sessionId });
    expect(second.body.reply).toMatch(/Sana/);
    expect(second.body.name).toBe('Sana');
  });

  test('validates input', async () => {
    expect((await request(app).post('/api/chat').send({})).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ message: 'x'.repeat(501) })).status).toBe(413);
  });

  test('GET /api/intents lists the intents', async () => {
    const res = await request(app).get('/api/intents');
    expect(res.body.count).toBeGreaterThan(25);
    expect(res.body.tags).toContain('admissions');
  });

  test('serves the web UI and 404s unknown API routes', async () => {
    const page = await request(app).get('/');
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/CampusBuddy/);
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
