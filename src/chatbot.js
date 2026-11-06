const fs = require('fs');
const path = require('path');
const { IntentMatcher } = require('./intentMatcher');
const { MemoryStore } = require('./memory');
const { applyRules } = require('./rules');

const DEFAULT_INTENTS = path.join(__dirname, '..', 'data', 'intents.json');

const FALLBACKS = [
  "Sorry{name_comma}, I didn't quite get that. Could you rephrase?",
  "I'm not sure about that one{name_comma}. Try asking about admissions, fees, exams, the library or the hostel.",
];

class Chatbot {
  constructor({ intentsPath = DEFAULT_INTENTS, intents, threshold = 0.35, random = Math.random } = {}) {
    const data = intents || JSON.parse(fs.readFileSync(intentsPath, 'utf8')).intents;
    this.intents = data;
    this.matcher = new IntentMatcher(data, { threshold });
    this.memory = new MemoryStore();
    this.random = random;
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }

  personalise(text, session) {
    return text
      .replace(/\{name_comma\}/g, session.name ? `, ${session.name}` : '')
      .replace(/\{name\}/g, session.name || 'there');
  }

  /**
   * Main entry point.
   * @returns {{reply: string, intent: string|null, confidence: number, source: 'rule'|'intent'|'fallback', suggestions: string[]}}
   */
  reply(message, sessionId = 'default') {
    const session = this.memory.get(sessionId);
    const text = String(message || '').trim();
    if (!text) return { reply: 'Please type a message.', intent: null, confidence: 0, source: 'fallback', suggestions: [] };
    session.remember('user', text);

    // 1) rule-based layer
    const ruled = applyRules(text, session);
    if (ruled) {
      session.remember('bot', ruled.reply);
      return { reply: ruled.reply, intent: ruled.rule, confidence: 1, source: 'rule', suggestions: [] };
    }

    // 2) intent matching (TF-IDF cosine similarity)
    const { intent, confidence, ranking } = this.matcher.match(text, { context: session.context });
    if (intent) {
      session.fallbacks = 0;
      session.lastIntent = intent.tag;
      if (intent.context_set) session.context = intent.context_set;
      else if (!intent.context_filter) session.context = null;
      const reply = this.personalise(this.pick(intent.responses), session);
      session.remember('bot', reply);
      return { reply, intent: intent.tag, confidence, source: 'intent', suggestions: intent.suggestions || [] };
    }

    // 3) fallback, with "did you mean" suggestions from the closest intents
    session.fallbacks += 1;
    let reply = this.personalise(this.pick(FALLBACKS), session);
    const close = ranking.filter((r) => r.score > 0.15).map((r) => r.tag.replace(/_/g, ' '));
    if (close.length) reply += ` Did you mean: ${close.join(', ')}?`;
    if (session.fallbacks >= 3) reply += ' You can also visit the Student Facilitation Center in the admin block for help.';
    session.remember('bot', reply);
    return { reply, intent: null, confidence, source: 'fallback', suggestions: ['Admissions', 'Fee structure', 'Library timings'] };
  }
}

module.exports = { Chatbot };
