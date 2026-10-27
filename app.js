'use strict';

/* ---------- カード（78枚） ---------- */

const MAJOR = [
  ['愚者', 'The Fool'],
  ['魔術師', 'The Magician'],
  ['女教皇', 'The High Priestess'],
  ['女帝', 'The Empress'],
  ['皇帝', 'The Emperor'],
  ['教皇', 'The Hierophant'],
  ['恋人', 'The Lovers'],
  ['戦車', 'The Chariot'],
  ['力', 'Strength'],
  ['隠者', 'The Hermit'],
  ['運命の輪', 'Wheel of Fortune'],
  ['正義', 'Justice'],
  ['吊るされた男', 'The Hanged Man'],
  ['死神', 'Death'],
  ['節制', 'Temperance'],
  ['悪魔', 'The Devil'],
  ['塔', 'The Tower'],
  ['星', 'The Star'],
  ['月', 'The Moon'],
  ['太陽', 'The Sun'],
  ['審判', 'Judgement'],
  ['世界', 'The World'],
];

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const SUITS = [
  ['wands', 'ワンド', 'Wands'],
  ['cups', 'カップ', 'Cups'],
  ['swords', 'ソード', 'Swords'],
  ['pentacles', 'ペンタクル', 'Pentacles'],
];

const RANKS = [
  ['エース', 'Ace', 'A'],
  ['2', 'Two', '2'],
  ['3', 'Three', '3'],
  ['4', 'Four', '4'],
  ['5', 'Five', '5'],
  ['6', 'Six', '6'],
  ['7', 'Seven', '7'],
  ['8', 'Eight', '8'],
  ['9', 'Nine', '9'],
  ['10', 'Ten', '10'],
  ['ペイジ', 'Page', 'P'],
  ['ナイト', 'Knight', 'Kn'],
  ['クイーン', 'Queen', 'Q'],
  ['キング', 'King', 'K'],
];

// parts は小さいカードで改行してよい位置（「の」の後）で区切った名前
const DECK = [
  ...MAJOR.map(([ja, en], i) => ({ suit: 'major', rank: ROMAN[i], ja, en, parts: [ja] })),
  ...SUITS.flatMap(([suit, sja, sen]) => RANKS.map(([rja, ren, rank]) => ({
    suit, rank, ja: `${sja}の${rja}`, en: `${ren} of ${sen}`, parts: [`${sja}の`, rja],
  }))),
];

/* ---------- スプレッド ---------- */

// 増やすときはここに足すだけ。layout は 'single' | 'celtic' | 'grid'（grid は枚数ぶん並べる）
const SPREADS = [
  { id: 'one', name: 'ワンオラクル', layout: 'single', positions: [''] },
  {
    id: 'celtic', name: 'ケルト十字', layout: 'celtic',
    positions: ['現状', '障害・試練', '顕在意識・目標', '潜在意識・根本', '過去',
      '近未来', '本人の立場', '周囲の環境', '願望・恐れ', '最終結果'],
  },
];

/* ---------- 抽選 ---------- */

// 0〜n-1 の一様な整数。剰余による偏りが出ないよう、端数の範囲は棄却して引き直す
function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

// 78枚をフィッシャー–イェーツでシャッフルして上から count 枚。正逆はそれぞれ独立に1/2
function drawCards(count) {
  const order = DECK.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, count).map((i) => ({ card: DECK[i], reversed: randomInt(2) === 1 }));
}

/* ---------- 表示 ---------- */

const GLYPHS = {
  major: '<path d="M12 2.5l1.9 7.6 7.6 1.9-7.6 1.9-1.9 7.6-1.9-7.6L2.5 12l7.6-1.9z"/>',
  wands: '<rect x="10.8" y="2.5" width="2.4" height="19" rx="1.2"/>'
    + '<path d="M13.2 7.5c2.6-.2 3.9-1.6 4.3-3.6-2.4.1-3.8 1.4-4.3 3.6zM10.8 12.5c-2.6-.2-3.9-1.6-4.3-3.6 2.4.1 3.8 1.4 4.3 3.6zM13.2 16.5c2.2-.2 3.3-1.4 3.6-3.1-2 .1-3.2 1.2-3.6 3.1z"/>',
  cups: '<path d="M6 3.5h12V7a6 6 0 0 1-12 0z"/><path d="M12 13v5.5M8 20.5h8M9.5 18.5h5"/>',
  swords: '<path d="M12 2l1.6 2.6V15h-3.2V4.6z"/><path d="M7 15h10M12 15v4.5"/><circle cx="12" cy="20.8" r="1.2"/>',
  pentacles: '<circle cx="12" cy="12" r="9"/><path d="M12 5l4.11 12.66L5.34 9.84h13.32L7.89 17.66z"/>',
};

const ORIENTATION = ['正位置', '逆位置'];

const $ = (sel) => document.querySelector(sel);
const spreadsEl = $('#spreads');
const boardEl = $('#board');
const hintEl = $('#hint');
const resultEl = $('#result');
const listEl = $('#list');
const copyBtn = $('#copy');
const copyLabel = copyBtn.querySelector('.label');
const drawBtn = $('#draw');

let spread = SPREADS[0];
let result = null;
let copyTimer = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function glyph(suit, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.innerHTML = GLYPHS[suit];
  return svg;
}

function renderSpreadButtons() {
  spreadsEl.replaceChildren(...SPREADS.map((s) => {
    const btn = el('button', null, s.name);
    btn.type = 'button';
    btn.dataset.id = s.id;
    btn.setAttribute('aria-pressed', String(s === spread));
    btn.addEventListener('click', () => selectSpread(s));
    return btn;
  }));
}

function selectSpread(s) {
  if (s === spread) return;
  spread = s;
  result = null;
  for (const btn of spreadsEl.children) btn.setAttribute('aria-pressed', String(btn.dataset.id === s.id));
  renderBoard();
}

// 裏向きのカードを並べ直す
function renderBoard() {
  const multi = spread.positions.length > 1;
  boardEl.className = `board board--${spread.layout}`;
  boardEl.replaceChildren(...spread.positions.map((_, i) => {
    const slot = el('div', `slot pos-${i + 1}`);
    const inner = el('div', 'slot-inner');
    const back = el('div', 'face back');
    back.append(glyph('major', 'back-mark'));
    inner.append(back, el('div', 'face front'));
    slot.append(inner);
    if (multi) slot.append(el('span', 'badge', String(i + 1)));
    return slot;
  }));
  resultEl.hidden = true;
  hintEl.hidden = true;
  drawBtn.textContent = 'カードを引く';
  resetCopyLabel();
}

function fillFront(slot, { card, reversed }) {
  const front = slot.querySelector('.front');
  front.className = `face front s-${card.suit}${reversed ? ' is-rev' : ''}`;
  const name = el('span', 'name');
  card.parts.forEach((part, i) => {
    if (i) name.append(document.createElement('wbr'));
    name.append(part);
  });
  front.replaceChildren(el('span', 'rank', card.rank), glyph(card.suit, 'glyph'), name, el('span', 'en', card.en));
  if (reversed) front.append(el('span', 'rev', '逆'));
}

function draw() {
  result = drawCards(spread.positions.length);
  const slots = [...boardEl.querySelectorAll('.slot')];
  boardEl.classList.remove('peek');

  // いったんアニメーションなしで裏向きに戻し、中身を差し替えてから順にめくる
  for (const slot of slots) {
    slot.classList.add('no-anim');
    slot.classList.remove('is-open');
  }
  void boardEl.offsetWidth;
  slots.forEach((slot, i) => {
    fillFront(slot, result[i]);
    slot.style.setProperty('--delay', `${i * 60}ms`);
    slot.classList.remove('no-anim');
  });
  void boardEl.offsetWidth;
  for (const slot of slots) slot.classList.add('is-open');

  renderList();
  resultEl.hidden = false;
  hintEl.hidden = spread.layout !== 'celtic';
  drawBtn.textContent = '引き直す';
  resetCopyLabel();
}

function renderList() {
  const multi = spread.positions.length > 1;
  listEl.classList.toggle('list--single', !multi);
  listEl.replaceChildren(...result.map(({ card, reversed }, i) => {
    const row = el('li', 'row');
    if (multi) row.append(el('span', 'row-num', String(i + 1)));
    const main = el('div', 'row-main');
    if (spread.positions[i]) main.append(el('span', 'row-pos', spread.positions[i]));
    const name = el('span', 'row-name', card.ja);
    name.append(el('span', 'row-en', card.en));
    main.append(name);
    row.append(main, el('span', `ori ${reversed ? 'ori--rev' : 'ori--up'}`, ORIENTATION[+reversed]));
    return row;
  }));
}

function resultText() {
  const multi = spread.positions.length > 1;
  const lines = result.map(({ card, reversed }, i) => {
    const text = `${card.ja}（${ORIENTATION[+reversed]}）`;
    if (!multi) return text;
    const pos = spread.positions[i];
    return `${i + 1}. ${pos ? `${pos}：` : ''}${text}`;
  });
  return [spread.name, ...lines].join('\n');
}

// file:// や古いブラウザで Clipboard API が使えないとき用
function legacyCopy(text) {
  const ta = el('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.append(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

async function copyResult() {
  if (!result) return;
  const text = resultText();
  let ok;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    ok = legacyCopy(text);
  }
  copyLabel.textContent = ok ? 'コピーしました' : 'コピーできませんでした';
  copyBtn.classList.toggle('is-done', ok);
  clearTimeout(copyTimer);
  copyTimer = setTimeout(resetCopyLabel, 1800);
}

function resetCopyLabel() {
  clearTimeout(copyTimer);
  copyLabel.textContent = '結果をコピー';
  copyBtn.classList.remove('is-done');
}

// ケルト十字の1と2は重なるので、タップで2を透かす
boardEl.addEventListener('click', (e) => {
  if (result && spread.layout === 'celtic' && e.target.closest('.pos-1, .pos-2')) {
    boardEl.classList.toggle('peek');
  }
});
drawBtn.addEventListener('click', draw);
copyBtn.addEventListener('click', copyResult);

renderSpreadButtons();
renderBoard();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
