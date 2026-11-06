const { tokenize, stem, TfidfModel, cosine } = require('../src/nlp');

describe('nlp helpers', () => {
  test('stem strips common suffixes', () => {
    expect(stem('timings')).toBe('tim');
    expect(stem('timing')).toBe('tim');
    expect(stem('libraries')).toBe('library');
    expect(stem('bus')).toBe('bus');
  });

  test('tokenize lowercases, removes stop words and punctuation', () => {
    expect(tokenize('What are the Library timings?')).toEqual(['library', 'tim']);
    expect(tokenize('Wi-Fi not working')).toEqual(['wifi', 'not', 'work']);
  });

  test('coverage measures how many words are known', () => {
    const m = new TfidfModel().fit(['library hours', 'hostel fee']);
    expect(m.coverage('library hours')).toBe(1);
    expect(m.coverage('library on mars')).toBeCloseTo(0.5);
  });

  test('cosine similarity of identical texts is 1, unrelated is 0', () => {
    const m = new TfidfModel().fit(['library hours', 'hostel fee', 'bus routes']);
    expect(cosine(m.transform('library hours'), m.vectors[0])).toBeCloseTo(1);
    expect(cosine(m.transform('bus routes'), m.vectors[0])).toBe(0);
  });
});
