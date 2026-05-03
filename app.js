const $ = (id) => document.getElementById(id);

const els = {
  sky: $('numberSky'),
  cloud: $('cursorCloud'),
  stars: $('stars'),
  resetStars: $('resetStars'),
  display: $('calcDisplay'),
  gameStage: $('gameStage'),
  feedback: $('feedback'),
  newRound: $('newRound'),
  qrCode: $('qrCode'),
  siteLink: $('siteLink'),
  talkToggle: $('talkToggle'),
  sayDisplay: $('sayDisplay'),
  backspaceCalc: $('backspaceCalc'),
  tabs: [...document.querySelectorAll('.game-tabs button')],
  calcButtons: [...document.querySelectorAll('[data-calc]')],
};

const siteUrl = 'https://dacameragirl.github.io/Numbers-R-Everywhere/';
const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

const state = {
  stars: Number(localStorage.getItem('numbersStars') || 0),
  game: 'pop',
  calc: '0',
  talk: true,
  memoryFirst: null,
  memoryLock: false,
};

const sky = {
  ctx: null,
  numbers: [],
  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return items.sort(() => Math.random() - 0.5);
}

function setStars(value) {
  state.stars = Math.max(0, value);
  localStorage.setItem('numbersStars', String(state.stars));
  els.stars.textContent = state.stars;
}

function cheer(message) {
  setStars(state.stars + 1);
  els.feedback.textContent = message;
  els.gameStage.classList.remove('good-pop');
  requestAnimationFrame(() => els.gameStage.classList.add('good-pop'));
}

function tryAgain(message = 'Not that one. Check the pattern again.') {
  els.feedback.textContent = message;
}

function setQrCode() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(siteUrl)}`;
  els.qrCode.src = qrUrl;
  els.siteLink.href = siteUrl;
}

function say(text) {
  if (!state.talk || !('speechSynthesis' in window)) return;
  const clean = String(text)
    .replaceAll('*', ' times ')
    .replaceAll('/', ' divided by ')
    .replaceAll('+', ' plus ')
    .replaceAll('-', ' minus ')
    .replaceAll('=', ' equals ');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 0.88;
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

function displayCalc() {
  els.display.textContent = state.calc.replaceAll('*', 'x').replaceAll('/', '\u00f7');
}

function resizeSky() {
  const scale = window.devicePixelRatio || 1;
  els.sky.width = Math.floor(window.innerWidth * scale);
  els.sky.height = Math.floor(window.innerHeight * scale);
  els.sky.style.width = `${window.innerWidth}px`;
  els.sky.style.height = `${window.innerHeight}px`;
  sky.ctx = els.sky.getContext('2d');
  sky.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  seedSky();
}

function seedSky() {
  sky.numbers = Array.from({ length: 130 }, () => ({
    n: rand(0, 99),
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.7,
    vy: 0.25 + Math.random() * 0.8,
    size: 16 + Math.random() * 36,
    blink: Math.random() * Math.PI * 2,
  }));
}

function drawSky() {
  const ctx = sky.ctx;
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  sky.numbers.forEach((item) => {
    item.x += item.vx + (sky.mouse.x - item.x) * 0.0012;
    item.y += item.vy + (sky.mouse.y - item.y) * 0.0007;
    if (item.y > window.innerHeight + 60) {
      item.y = -60;
      item.x = Math.random() * window.innerWidth;
    }
    if (item.x < -60) item.x = window.innerWidth + 60;
    if (item.x > window.innerWidth + 60) item.x = -60;

    const alpha = 0.22 + Math.abs(Math.sin(performance.now() / 430 + item.blink)) * 0.68;
    ctx.font = `900 ${item.size}px Trebuchet MS, sans-serif`;
    ctx.fillStyle = `rgba(17, 103, 177, ${alpha})`;
    ctx.shadowColor = 'rgba(255, 91, 189, .7)';
    ctx.shadowBlur = 20;
    ctx.fillText(item.n, item.x, item.y);
  });
  requestAnimationFrame(drawSky);
}

function cursorNumber(x, y) {
  const bit = document.createElement('span');
  bit.className = 'cursor-number';
  bit.textContent = rand(0, 99);
  bit.style.left = `${x}px`;
  bit.style.top = `${y}px`;
  bit.style.setProperty('--dx', `${rand(-54, 54)}px`);
  els.cloud.appendChild(bit);
  bit.addEventListener('animationend', () => bit.remove(), { once: true });
}

function calculator(value) {
  if (value === 'clear') {
    state.calc = '0';
    say('clear');
  } else if (value === 'backspace') {
    state.calc = state.calc.length > 1 ? state.calc.slice(0, -1) : '0';
    say(state.calc);
  } else if (value === '=') {
    try {
      const result = Function(`"use strict"; return (${state.calc})`)();
      state.calc = Number.isFinite(result) ? String(Math.round(result * 1000) / 1000) : '0';
      say(`equals ${state.calc}`);
    } catch {
      state.calc = 'Oops';
      say('oops');
    }
  } else {
    if (state.calc === '0' || state.calc === 'Oops') state.calc = '';
    state.calc += value;
    say(value);
  }
  displayCalc();
}

function choiceButton(label, isCorrect) {
  return `<button type="button" data-correct="${isCorrect ? 'yes' : 'no'}">${label}</button>`;
}

function renderPop() {
  const target = primes[rand(0, primes.length - 1)];
  const nums = shuffle([target, rand(10, 50), rand(10, 50), rand(10, 50), rand(10, 50)]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">Pop the prime number ${target}</div>
      <div class="choices">${nums.map((n) => `<button class="number-pop" type="button" data-correct="${n === target ? 'yes' : 'no'}">${n}</button>`).join('')}</div>
    </div>`;
}

function renderCount() {
  const rows = rand(2, 5);
  const columns = rand(3, 7);
  const amount = rows * columns;
  const choices = shuffle([amount, amount + rows, amount + columns, Math.max(1, amount - rows)]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">${rows} rows x ${columns} columns = ?</div>
      <div class="blocks" style="max-width:${columns * 66}px">${Array.from({ length: amount }, (_, i) => `<span class="block">${i + 1}</span>`).join('')}</div>
      <div class="choices">${choices.map((n) => choiceButton(n, n === amount)).join('')}</div>
    </div>`;
}

function renderBigger() {
  const a = rand(10, 999);
  let b = rand(10, 999);
  while (b === a) b = rand(10, 999);
  const big = Math.max(a, b);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">Which number is bigger?</div>
      <div class="choices">${choiceButton(a, a === big)}${choiceButton(b, b === big)}</div>
    </div>`;
}

function renderMissing() {
  const start = rand(2, 18);
  const step = rand(2, 9);
  const missingIndex = rand(1, 4);
  const seq = Array.from({ length: 6 }, (_, i) => start + i * step);
  const miss = seq[missingIndex];
  const choices = shuffle([miss, miss + step, miss - step, miss + rand(1, 5)]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">${seq.map((n) => n === miss ? '?' : n).join('  ')}</div>
      <div class="choices">${choices.map((n) => choiceButton(n, n === miss)).join('')}</div>
    </div>`;
}

function renderSum() {
  const answer = rand(20, 99);
  const a = rand(6, answer - 6);
  const b = answer - a;
  const choices = shuffle([`${a} + ${b}`, `${a + 3} + ${Math.max(1, b - 5)}`, `${Math.max(1, a - 4)} + ${b + 2}`]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">Build ${answer}</div>
      <div class="choices">${choices.map((text) => choiceButton(text, text === `${a} + ${b}`)).join('')}</div>
    </div>`;
}

function renderSpeed() {
  const a = rand(8, 49);
  const b = rand(8, 49);
  const answer = a + b;
  const choices = shuffle([answer, answer + 1, Math.max(1, answer - 2), answer + 3]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">${a} + ${b} = ?</div>
      <div class="choices">${choices.map((n) => choiceButton(n, n === answer)).join('')}</div>
    </div>`;
}

function renderMemory() {
  state.memoryFirst = null;
  state.memoryLock = false;
  const pairValues = shuffle([12, 24, 36, 48, 12, 24, 36, 48]);
  els.gameStage.innerHTML = `
    <div class="game-card">
      <div class="prompt">Match the number pairs</div>
      <div class="memory-grid">${pairValues.map((n, i) => `<button class="memory-card" type="button" data-value="${n}" data-index="${i}">?</button>`).join('')}</div>
    </div>`;
}

const renderers = {
  pop: renderPop,
  count: renderCount,
  bigger: renderBigger,
  missing: renderMissing,
  sum: renderSum,
  speed: renderSpeed,
  memory: renderMemory,
};

function newRound() {
  els.feedback.textContent = 'Find the number strategy.';
  renderers[state.game]();
}

function handleGameClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.classList.contains('memory-card')) {
    if (state.memoryLock || button.dataset.done === 'yes') return;
    button.textContent = button.dataset.value;
    say(button.dataset.value);
    if (!state.memoryFirst) {
      state.memoryFirst = button;
      return;
    }
    const first = state.memoryFirst;
    state.memoryFirst = null;
    if (first !== button && first.dataset.value === button.dataset.value) {
      first.dataset.done = 'yes';
      button.dataset.done = 'yes';
      cheer('Match.');
      say('match');
      if ([...document.querySelectorAll('.memory-card')].every((card) => card.dataset.done === 'yes')) {
        setTimeout(newRound, 700);
      }
    } else {
      state.memoryLock = true;
      setTimeout(() => {
        first.textContent = '?';
        button.textContent = '?';
        state.memoryLock = false;
      }, 650);
      tryAgain('Not a match yet.');
      say('not a match yet');
    }
    return;
  }

  if (button.dataset.correct === 'yes') {
    cheer('Correct. Number power.');
    say('Correct');
    setTimeout(newRound, 650);
  } else if (button.dataset.correct === 'no') {
    tryAgain();
    say('Try again');
  }
}

function bind() {
  setQrCode();
  setStars(state.stars);
  resizeSky();
  requestAnimationFrame(drawSky);
  newRound();

  window.addEventListener('resize', resizeSky);
  window.addEventListener('pointermove', (event) => {
    sky.mouse.x = event.clientX;
    sky.mouse.y = event.clientY;
    if (Math.random() > 0.62) cursorNumber(event.clientX, event.clientY);
  });

  els.calcButtons.forEach((button) => button.addEventListener('click', () => calculator(button.dataset.calc)));
  els.sayDisplay.addEventListener('click', () => say(state.calc));
  els.backspaceCalc.addEventListener('click', () => calculator('backspace'));
  els.talkToggle.addEventListener('click', () => {
    state.talk = !state.talk;
    els.talkToggle.textContent = state.talk ? 'Talk: On' : 'Talk: Off';
    els.talkToggle.setAttribute('aria-pressed', String(state.talk));
    if (state.talk) say('Talk on');
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  });
  els.resetStars.addEventListener('click', () => setStars(0));
  els.newRound.addEventListener('click', newRound);
  els.gameStage.addEventListener('click', handleGameClick);
  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      state.game = tab.dataset.game;
      newRound();
    });
  });

  window.addEventListener('keydown', (event) => {
    const keyMap = {
      Enter: '=',
      Backspace: 'backspace',
      Escape: 'clear',
      x: '*',
      X: '*',
    };
    const key = keyMap[event.key] || event.key;
    if (/^[0-9+\-*/.=]$/.test(key) || ['backspace', 'clear'].includes(key)) {
      event.preventDefault();
      calculator(key === '.' ? '.' : key);
    }
  });
}

bind();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
