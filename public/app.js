// Front end: talks to POST /api/chat and renders the conversation.
const messagesEl = document.getElementById('messages');
const chipsEl = document.getElementById('chips');
const form = document.getElementById('form');
const input = document.getElementById('input');
const showMeta = document.getElementById('showMeta');

let sessionId = localStorage.getItem('campusbuddy-session') || null;

function addMessage(text, who, meta) {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  if (meta && showMeta.checked) {
    const m = document.createElement('span');
    m.className = 'meta';
    const tag = document.createElement('span');
    tag.className = 'tag' + (meta.source === 'fallback' ? ' fallback' : '');
    tag.textContent = meta.source === 'intent' ? meta.intent : meta.source === 'rule' ? `rule: ${meta.intent}` : 'fallback';
    m.appendChild(tag);
    m.appendChild(document.createTextNode(`confidence ${(meta.confidence * 100).toFixed(0)}%`));
    div.appendChild(m);
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function setChips(list) {
  chipsEl.innerHTML = '';
  for (const label of list || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.onclick = () => send(label);
    chipsEl.appendChild(b);
  }
}

async function send(text) {
  addMessage(text, 'user');
  const typing = addMessage('CampusBuddy is typing...', 'bot typing');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    sessionId = data.sessionId;
    localStorage.setItem('campusbuddy-session', sessionId);
    addMessage(data.reply, 'bot', data);
    setChips(data.suggestions);
  } catch (err) {
    typing.remove();
    addMessage(`Error: ${err.message}`, 'bot');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  send(text);
});

document.getElementById('reset').addEventListener('click', async () => {
  if (sessionId) await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  sessionId = null;
  localStorage.removeItem('campusbuddy-session');
  messagesEl.innerHTML = '';
  greet();
});

function greet() {
  addMessage("Hi! I'm CampusBuddy. Ask me anything about campus life - admissions, fees, exams, library, hostel, transport, Wi-Fi...", 'bot');
  setChips(['My name is Ali', 'Library timings', 'Fee structure', 'Scholarships']);
}

greet();
