/**
 * Per-user conversation memory: name, current context and recent history.
 * Kept in a Map in memory (good enough for a demo; a real app would use a DB).
 */
class Session {
  constructor(id) {
    this.id = id;
    this.name = null;
    this.context = null;
    this.lastIntent = null;
    this.history = [];
    this.fallbacks = 0;
    this.createdAt = new Date();
  }

  remember(role, text) {
    this.history.push({ role, text, at: new Date().toISOString() });
    if (this.history.length > 20) this.history.shift();
  }
}

class MemoryStore {
  constructor() {
    this.sessions = new Map();
  }

  get(id = 'default') {
    if (!this.sessions.has(id)) this.sessions.set(id, new Session(id));
    return this.sessions.get(id);
  }

  reset(id) {
    this.sessions.delete(id);
  }

  get size() {
    return this.sessions.size;
  }
}

module.exports = { MemoryStore, Session };
