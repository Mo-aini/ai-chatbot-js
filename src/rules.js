/**
 * Rule-based layer, checked BEFORE intent matching. Each rule has a regex and
 * a handler that can read/update the session. These cover things TF-IDF is bad
 * at: extracting a name, answering about memory, dynamic answers like the time.
 */

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const NOT_NAMES = new Set(['fine', 'good', 'ok', 'okay', 'here', 'looking', 'new', 'student', 'confused', 'lost', 'not', 'a', 'the', 'from', 'in']);

const rules = [
  {
    name: 'set_name',
    pattern: /\b(?:my name is|i am|i'm|im|call me|this is)\s+([a-z][a-z'-]{1,20})(?:\s+([a-z][a-z'-]{1,20}))?\b/i,
    handle(match, session) {
      const first = match[1].toLowerCase();
      if (NOT_NAMES.has(first)) return null; // "I'm fine" is not a name
      const second = match[2] && !NOT_NAMES.has(match[2].toLowerCase()) && /^(my name is|call me)/i.test(match[0]) ? ' ' + capitalise(match[2]) : '';
      session.name = capitalise(first) + second;
      return `Nice to meet you, ${session.name}! I'll remember your name. What would you like to know about campus?`;
    },
  },
  {
    name: 'get_name',
    pattern: /\b(what(?:'s| is) my name|do you (?:know|remember) (?:my name|me)|who am i)\b/i,
    handle(match, session) {
      return session.name
        ? `Your name is ${session.name}. I remembered it from earlier in our chat.`
        : "I don't know your name yet. Tell me with \"My name is ...\" and I'll remember it.";
    },
  },
  {
    name: 'forget',
    pattern: /\b(forget (?:me|my name)|clear (?:the )?(?:chat|memory)|start over)\b/i,
    handle(match, session) {
      session.name = null;
      session.context = null;
      session.history = [];
      return 'Done. I have cleared what I remembered about you.';
    },
  },
  {
    name: 'time',
    pattern: /\b(what(?:'s| is) the time|current time|what time is it)\b/i,
    handle(match, session, now = new Date()) {
      return `It's ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} right now.`;
    },
  },
  {
    name: 'history',
    pattern: /\b(what did i (?:just )?ask|my last question)\b/i,
    handle(match, session) {
      const previous = [...session.history].reverse().find((h) => h.role === 'user');
      return previous ? `You asked: "${previous.text}"` : "You haven't asked me anything yet.";
    },
  },
];

function applyRules(message, session) {
  for (const rule of rules) {
    const m = message.match(rule.pattern);
    if (!m) continue;
    const reply = rule.handle(m, session);
    if (reply) return { rule: rule.name, reply };
  }
  return null;
}

module.exports = { applyRules, rules };
