const { TfidfModel, cosine } = require('./nlp');

/**
 * Finds the intent whose example patterns are most similar (TF-IDF cosine)
 * to the user's message. Intents with a "context_filter" are only eligible
 * when the conversation is in that context (follow-up questions).
 */
class IntentMatcher {
  constructor(intents, { threshold = 0.35 } = {}) {
    this.intents = intents;
    this.threshold = threshold;
    this.patterns = [];
    for (const intent of intents) {
      for (const p of intent.patterns) this.patterns.push({ tag: intent.tag, text: p });
    }
    this.model = new TfidfModel().fit(this.patterns.map((p) => p.text));
    this.byTag = new Map(intents.map((i) => [i.tag, i]));
  }

  /**
   * @returns {{intent: object|null, confidence: number, ranking: {tag, score}[]}}
   */
  match(message, { context = null } = {}) {
    const query = this.model.transform(message);
    // Messages full of words the bot has never seen ("capital of mars") get a
    // lower score, so one shared common word can't produce a confident match.
    const coverage = Math.sqrt(this.model.coverage(message));
    const best = new Map(); // tag -> best pattern score
    this.patterns.forEach((p, i) => {
      const intent = this.byTag.get(p.tag);
      if (intent.context_filter && intent.context_filter !== context) return;
      const score = cosine(query, this.model.vectors[i]) * coverage;
      if (score > (best.get(p.tag) || 0)) best.set(p.tag, score);
    });

    // a follow-up that fits the current context gets a small boost
    for (const [tag, score] of best) {
      const intent = this.byTag.get(tag);
      if (context && intent.context_filter === context) best.set(tag, Math.min(1, score + 0.1));
    }

    const ranking = [...best.entries()]
      .map(([tag, score]) => ({ tag, score: Number(score.toFixed(3)) }))
      .sort((a, b) => b.score - a.score);
    const top = ranking[0];
    if (!top || top.score < this.threshold) return { intent: null, confidence: top ? top.score : 0, ranking: ranking.slice(0, 3) };
    return { intent: this.byTag.get(top.tag), confidence: top.score, ranking: ranking.slice(0, 3) };
  }
}

module.exports = { IntentMatcher };
