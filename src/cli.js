#!/usr/bin/env node
/** Command-line chat:  npm run cli   (type "quit" to exit) */
const readline = require('readline');
const { Chatbot } = require('./chatbot');

const bot = new Chatbot();
const interactive = process.stdin.isTTY;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });

console.log('CampusBuddy - campus help-desk chatbot (type "quit" to exit)\n');
if (interactive) rl.setPrompt('You: '), rl.prompt();

rl.on('line', (line) => {
  const text = line.trim();
  if (!text) return interactive && rl.prompt();
  if (!interactive) console.log(`You: ${text}`);
  if (/^(quit|exit)$/i.test(text)) {
    console.log('Bot: Goodbye!');
    rl.close();
    return;
  }
  const res = bot.reply(text, 'cli');
  const meta = res.source === 'intent' ? ` [${res.intent} ${(res.confidence * 100).toFixed(0)}%]` : ` [${res.source}]`;
  console.log(`Bot: ${res.reply}${process.env.DEBUG_INTENTS ? meta : ''}\n`);
  if (interactive) rl.prompt();
});
