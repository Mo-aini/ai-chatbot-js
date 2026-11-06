const { Chatbot } = require('../src/chatbot');

const makeBot = () => new Chatbot({ random: () => 0 }); // deterministic responses

describe('intent matching', () => {
  const bot = makeBot();
  test.each([
    ['When does the library open?', 'library_hours'],
    ['how much is the tuition fee', 'fee_structure'],
    ['Is there any scholarship for students?', 'scholarships'],
    ['my wifi is not working', 'wifi'],
    ['I forgot my LMS password', 'lms_password'],
    ['when is the final exam', 'exam_schedule'],
    ['is there a hostel for girls', 'hostel'],
    ['what are the bus routes', 'transport'],
  ])('"%s" -> %s', (message, tag) => {
    expect(bot.reply(message, 'intent-test').intent).toBe(tag);
  });
});

describe('fallback handling', () => {
  test('unknown questions fall back with suggestions', () => {
    const bot = makeBot();
    const res = bot.reply('what is the capital of mars', 's1');
    expect(res.source).toBe('fallback');
    expect(res.intent).toBeNull();
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  test('after 3 fallbacks the bot points to a human office', () => {
    const bot = makeBot();
    bot.reply('qwerty', 's2');
    bot.reply('asdfgh', 's2');
    expect(bot.reply('zxcvbn', 's2').reply).toMatch(/Student Facilitation Center/);
  });

  test('empty message is rejected politely', () => {
    expect(makeBot().reply('   ').reply).toMatch(/type a message/);
  });
});

describe('memory and context', () => {
  test('remembers the name and uses it in later replies', () => {
    const bot = makeBot();
    expect(bot.reply('Hi, my name is Ayesha', 'm1').reply).toMatch(/Nice to meet you, Ayesha/);
    expect(bot.reply('what is my name?', 'm1').reply).toMatch(/Ayesha/);
    expect(bot.reply('thanks', 'm1').reply).toMatch(/Ayesha/);
  });

  test('"I am fine" is not taken as a name', () => {
    const bot = makeBot();
    bot.reply("I'm fine", 'm2');
    expect(bot.memory.get('m2').name).toBeNull();
  });

  test('sessions are isolated from each other', () => {
    const bot = makeBot();
    bot.reply('call me Bilal', 'a');
    expect(bot.reply('what is my name', 'b').reply).toMatch(/don't know your name/);
  });

  test('follow-up question uses the library context', () => {
    const bot = makeBot();
    bot.reply('library timings', 'c1');
    expect(bot.reply('what about weekends?', 'c1').intent).toBe('library_weekend');
  });

  test('follow-up intent is not matched without its context', () => {
    const bot = makeBot();
    expect(bot.reply('what about weekends?', 'c2').intent).not.toBe('library_weekend');
  });

  test('forget clears the memory', () => {
    const bot = makeBot();
    bot.reply('my name is Hamza', 'f1');
    bot.reply('forget me', 'f1');
    expect(bot.memory.get('f1').name).toBeNull();
  });
});
