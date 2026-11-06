// Text processing helpers: tokenizer, a tiny suffix stemmer and TF-IDF.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'to', 'of', 'in', 'on',
  'at', 'for', 'and', 'or', 'it', 'its', 'this', 'that', 'there', 'please', 'could',
  'would', 'will', 'does', 'did', 'me', 'my', 'about', 'tell', 'want', 'know', 'some',
  'any', 'so', 'just', 'pls', 'plz', 'what', 'how', 'when', 'where', 'which', 'why',
  'i', 'we', 'much', 'many', 'get', 'have', 'has',
]);

/**
 * Very small stemmer: strips common English suffixes so "timings", "timing"
 * and "time" end up as the same token. Not as good as Porter, but enough here.
 */
function stem(word) {
  if (word.length <= 3) return word;
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ness', 'ies', 'ed', 'es', 's']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      const base = word.slice(0, -suffix.length);
      return suffix === 'ies' ? base + 'y' : base;
    }
  }
  return word;
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/wi-?fi/g, 'wifi')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t))
    .map(stem);
}

class TfidfModel {
  fit(documents) {
    const tokenLists = documents.map(tokenize);
    const df = new Map();
    for (const tokens of tokenLists) for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
    this.idf = new Map();
    const n = tokenLists.length;
    for (const [t, count] of df) this.idf.set(t, Math.log((1 + n) / (1 + count)) + 1);
    this.vectors = tokenLists.map((tokens) => this.vectorFromTokens(tokens));
    return this;
  }

  vectorFromTokens(tokens) {
    const tf = new Map();
    for (const t of tokens) if (this.idf.has(t)) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    let norm = 0;
    for (const [t, c] of tf) {
      const w = c * this.idf.get(t);
      vec.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm);
    if (norm) for (const [t, w] of vec) vec.set(t, w / norm);
    return vec;
  }

  transform(text) {
    return this.vectorFromTokens(tokenize(text));
  }

  /** Share of the message's tokens that the model has seen (0..1). */
  coverage(text) {
    const tokens = tokenize(text);
    if (!tokens.length) return 0;
    return tokens.filter((t) => this.idf.has(t)).length / tokens.length;
  }
}

/** Cosine similarity of two L2-normalised sparse vectors = their dot product. */
function cosine(a, b) {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) if (large.has(t)) dot += w * large.get(t);
  return dot;
}

module.exports = { tokenize, stem, TfidfModel, cosine, STOP_WORDS };
