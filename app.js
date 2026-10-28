'use strict';

// ---------- units (factor = value of 1 unit in the base unit) ----------

// base: square feet
const AREA_UNITS = [
  { id: 'gajam', te: 'గజాలు', en: 'Gajam · sq. yard', f: 9 },
  { id: 'ankanam', te: 'అంకణాలు', en: 'Ankanam · 72 sq. ft', f: 72 },
  { id: 'cents', te: 'సెంట్లు', en: 'Cents', f: 435.6 },
  { id: 'gunta', te: 'గుంటలు', en: 'Gunta · 1,089 sq. ft', f: 1089 },
  { id: 'acre', te: 'ఎకరాలు', en: 'Acres', f: 43560 },
  { id: 'sqft', te: 'చదరపు అడుగులు', en: 'Sq. feet', f: 1 },
  { id: 'sqm', te: 'చదరపు మీటర్లు', en: 'Sq. metres', f: 10.7639104 },
];

// base: metres; the feet + inches pair counts in inches
const LENGTH_UNITS = [
  { id: 'link', te: 'లింకులు', en: 'Links', f: 0.201168 },
  { id: 'ftin', te: 'అడుగులు + అంగుళాలు', en: 'Feet + inches', f: 0.0254, pair: true },
  { id: 'ft', te: 'అడుగులు', en: 'Feet (decimal)', f: 0.3048 },
  { id: 'in', te: 'అంగుళాలు', en: 'Inches', f: 0.0254 },
  { id: 'm', te: 'మీటర్లు', en: 'Metres', f: 1 },
  { id: 'cm', te: 'సెంటీమీటర్లు', en: 'Centimetres', f: 0.01 },
];

// base: grams
const WEIGHT_UNITS = [
  { id: 'g', te: 'గ్రాములు', en: 'Grams', f: 1 },
  { id: 'savara', te: 'సవర', en: 'Sovereign · 8 g', f: 8 },
  { id: 'tulam', te: 'తులం', en: 'Tola · 10 g (shops today)', f: 10 },
  { id: 'oldtulam', te: 'పాత తులం', en: 'Old tola · 11.664 g', f: 11.664 },
  { id: 'kg', te: 'కిలోగ్రాములు', en: 'Kilograms', f: 1000 },
  { id: 'mg', te: 'మిల్లీగ్రాములు', en: 'Milligrams', f: 0.001 },
  { id: 'oz', te: 'ఔన్సులు (బంగారం)', en: 'Troy ounce · 31.1 g', f: 31.1034768 },
];

// plot side lengths → feet
const LEN_TO_FT = { ft: 1, m: 1 / 0.3048, link: 0.66 };
const LEN_SHORT = { ft: 'అడుగు', m: 'మీటర్', link: 'లింక్' };

// ---------- number helpers ----------

function parseNum(s) {
  if (s == null) return NaN;
  const t = String(s).replace(/,/g, '').trim();
  if (t === '' || t === '.') return NaN;
  return Number(t);
}

function fmt(n) {
  if (!Number.isFinite(n)) return '';
  const a = Math.abs(n);
  const digits = a >= 1000 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 4 : 6;
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits });
}

// feet + inches → total inches; NaN when both are empty
function ftInToInches(ft, inch) {
  if (isNaN(ft) && isNaN(inch)) return NaN;
  return (ft || 0) * 12 + (inch || 0);
}

// total inches → [feet, inches], inches to one decimal
function inchesToFtIn(total) {
  const t = Math.round(total * 10) / 10;
  const ft = Math.floor(t / 12);
  return [ft, Math.round((t - ft * 12) * 10) / 10];
}

function fmtRs(n) {
  const r = Math.round(n * 100) / 100;
  const paise = Number.isInteger(r) ? 0 : 2;
  return '₹' + r.toLocaleString('en-IN', { minimumFractionDigits: paise, maximumFractionDigits: 2 });
}

// ---------- geometry ----------

function heron(a, b, c) {
  const s = (a + b + c) / 2;
  const q = s * (s - a) * (s - b) * (s - c);
  return q > 0 ? Math.sqrt(q) : NaN;
}

// area in (input unit)², NaN if the measurements can't form the shape
function plotArea(shape, v) {
  if (shape === 'rect') return v.l * v.w;
  if (shape === 'tri') return heron(v.a, v.b, v.c);
  return heron(v.a, v.b, v.e) + heron(v.c, v.d, v.e);
}

// third corner of a triangle on base (0,0)–(base,0); side `fromStart` from (0,0), `fromEnd` from (base,0)
function apex(base, fromStart, fromEnd, up) {
  const x = (base * base + fromStart * fromStart - fromEnd * fromEnd) / (2 * base);
  const y = Math.sqrt(Math.max(0, fromStart * fromStart - x * x));
  return [x, up ? -y : y];
}

function plotGeometry(shape, v) {
  // edges: [from corner, to corner, badge label, field key]
  if (shape === 'rect') {
    return { pts: [[0, 0], [v.l, 0], [v.l, v.w], [0, v.w]], edges: [[0, 1, '1', 'l'], [1, 2, '2', 'w']] };
  }
  if (shape === 'tri') {
    return {
      pts: [[0, 0], [v.a, 0], apex(v.a, v.c, v.b, true)],
      edges: [[0, 1, '1', 'a'], [1, 2, '2', 'b'], [2, 0, '3', 'c']],
    };
  }
  // A, B, C, D around the plot with diagonal A–C laid flat, then tilted so A is top-left
  const raw = [[0, 0], apex(v.e, v.a, v.b, true), [v.e, 0], apex(v.e, v.d, v.c, false)];
  const t = 35 * Math.PI / 180, cos = Math.cos(t), sin = Math.sin(t);
  return {
    pts: raw.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]),
    edges: [[0, 1, '1', 'a'], [1, 2, '2', 'b'], [2, 3, '3', 'c'], [3, 0, '4', 'd']],
    diag: [0, 2, 'క', 'e'],
  };
}

// ---------- calculator ----------

const OPS = '+−×÷';

function evaluate(s) {
  if (!s) return null;
  const t = [];
  let i = 0, neg = false;
  if (s[0] === '−') { neg = true; i = 1; }
  while (i < s.length) {
    if (OPS.includes(s[i])) { t.push(s[i]); i++; continue; }
    let j = i;
    while (j < s.length && /[\d.]/.test(s[j])) j++;
    if (j === i) return null;
    let v = Number(s.slice(i, j));
    let pct = false;
    if (s[j] === '%') { pct = true; j++; }
    if (neg) { v = -v; neg = false; }
    t.push({ v, pct });
    i = j;
  }
  while (t.length && typeof t[t.length - 1] === 'string') t.pop();
  if (!t.length) return null;

  // a + b% means a + (b% of a), like a phone calculator; elsewhere b% is b/100
  let sum = 0, sign = 1, k = 0, first = true;
  while (k < t.length) {
    const start = t[k++];
    let prod = start.pct ? start.v / 100 : start.v;
    let single = true;
    while (k < t.length && (t[k] === '×' || t[k] === '÷')) {
      const op = t[k], n = t[k + 1];
      const nv = n.pct ? n.v / 100 : n.v;
      prod = op === '×' ? prod * nv : prod / nv;
      k += 2;
      single = false;
    }
    if (single && start.pct && !first) prod = sum * start.v / 100;
    sum += sign * prod;
    first = false;
    if (k < t.length) { sign = t[k] === '+' ? 1 : -1; k++; }
  }
  return Number.isFinite(sum) ? parseFloat(sum.toPrecision(12)) : sum;
}

function numToExpr(r) {
  let s = String(r);
  if (s.includes('e')) s = r.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('-', '−');
}

function prettyExpr(e) {
  return e
    .replace(/\d+(\.\d*)?/g, m => {
      const [ip, dp] = m.split('.');
      return Number(ip).toLocaleString('en-IN') + (dp !== undefined ? '.' + dp : '');
    })
    .replace(/([+×÷]|(?!^)−)/g, ' $1 ');
}

// ---------- interest ----------

function diffYMD(from, to) {
  if (to < from) return null;
  // `from` moved forward n months, clamped to the end of shorter months (31 Jan + 1 → 29 Feb)
  const plusMonths = n => {
    const a = new Date(from.getFullYear(), from.getMonth() + n, 1);
    a.setDate(Math.min(from.getDate(), new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate()));
    return a;
  };
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (plusMonths(months) > to) months--;
  const d = Math.round((to - plusMonths(months)) / 86400000);
  return { y: Math.floor(months / 12), m: months % 12, d };
}

// annualRate in %, months may be fractional (30-day months for days)
function interestFor(P, annualRate, months, compound, perYear) {
  const years = months / 12;
  if (!compound) return P * annualRate * years / 100;
  return P * Math.pow(1 + annualRate / 100 / perYear, perYear * years) - P;
}

// monthly instalment on a reducing balance
function emiFor(P, annualRate, months) {
  const r = annualRate / 1200;
  if (r === 0) return P / months;
  const g = Math.pow(1 + r, months);
  return P * r * g / (g - 1);
}

function periodText({ y, m, d }) {
  const parts = [];
  if (y) parts.push(`${fmt(y)} ${y === 1 ? 'సంవత్సరం' : 'సంవత్సరాలు'}`);
  if (m) parts.push(`${fmt(m)} ${m === 1 ? 'నెల' : 'నెలలు'}`);
  if (d) parts.push(`${fmt(d)} ${d === 1 ? 'రోజు' : 'రోజులు'}`);
  return parts.join(' ') || '0 రోజులు';
}

// =====================================================================
// UI
// =====================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// keeps only digits and one dot; returns the cleaned text
function cleanNumInput(input) {
  const raw = input.value;
  let v = raw.replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  if (v !== raw) input.value = v;
  return v;
}

function enhanceNum(el) {
  el.type = 'text';
  el.inputMode = 'decimal';
  el.autocomplete = 'off';
  el.enterKeyHint = 'done';
  el.addEventListener('focus', () => { if (el.value.includes(',')) el.value = el.value.replace(/,/g, ''); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
  return el;
}

function numInput() {
  const el = document.createElement('input');
  el.className = 'num';
  return enhanceNum(el);
}

// two boxes side by side: feet and inches
function ftInPair() {
  const wrap = document.createElement('span');
  wrap.className = 'pair';
  const ft = numInput(), inch = numInput();
  for (const [inp, caption] of [[ft, 'అడుగులు'], [inch, 'అంగుళాలు']]) {
    const cell = document.createElement('span');
    cell.className = 'pair-cell';
    const small = document.createElement('small');
    small.textContent = caption;
    cell.append(inp, small);
    wrap.append(cell);
  }
  return { wrap, ft, inch };
}

function segmented(el, onChange) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.classList.contains('on')) return;
    $$('button', el).forEach(x => x.classList.toggle('on', x === b));
    onChange(b.dataset.v);
  });
}

function setSeg(el, v) {
  $$('button', el).forEach(x => x.classList.toggle('on', x.dataset.v === v));
}

// a short glow so the eye notices a number that just changed
function flash(el) {
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function setText(el, text) {
  if (el.textContent === text) return;
  el.textContent = text;
  if (text !== '—') flash(el);
}

// message bar above the tabs; with `undo` it offers to bring things back
let toastTimer;
function toast(msg, undo) {
  const el = $('#toast'), btn = $('#toast-undo');
  $('#toast-msg').textContent = msg;
  btn.hidden = !undo;
  btn.onclick = () => { undo(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 6000 : 1800);
}

const CLEARED = 'అన్నీ తుడిచేశాం';

function initTextSize() {
  const SIZES = [[1, 'సాధారణ అక్షరాలు'], [1.15, 'పెద్ద అక్షరాలు'], [1.3, 'ఇంకా పెద్ద అక్షరాలు']];
  let i = Number(store.get('size')) || 0;
  if (!SIZES[i]) i = 0;
  const apply = () => document.documentElement.style.setProperty('--zoom', SIZES[i][0]);
  apply();
  $('#size-btn').addEventListener('click', () => {
    i = (i + 1) % SIZES.length;
    apply();
    store.set('size', i);
    toast(SIZES[i][1]);
  });
}

// ---------- tabs ----------

function initTabs() {
  const main = $('#main'), title = $('#title');
  const order = [...$$('.tab').map(t => t.dataset.to), 'about'];
  let current = null;
  const show = id => {
    const screen = document.getElementById(id);
    if (!screen || id === current) return;
    // slide in from the side of the tab that was tapped
    if (current) {
      screen.classList.remove('in-l', 'in-r');
      void screen.offsetWidth;
      screen.classList.add(order.indexOf(id) > order.indexOf(current) ? 'in-r' : 'in-l');
    }
    current = id;
    $$('.screen').forEach(s => s.classList.toggle('active', s === screen));
    $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.to === id));
    title.textContent = screen.dataset.title;
    main.scrollTop = 0;
    if (id !== 'about') store.set('tab', id);
  };
  $('#tabbar').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) show(t.dataset.to);
  });
  $('#about-btn').addEventListener('click', () => show('about'));
  show(location.hash.slice(1) || store.get('tab') || 'area');
}

// ---------- converters ----------

function initConverter(root, units) {
  const list = $('.unit-list', root);
  const show = (inp, v) => {
    if (inp.value === v) return;
    inp.value = v;
    if (v) flash(inp);
  };
  // each row knows how to read its value into the base unit and show a base value
  const rows = units.map(u => {
    const row = document.createElement('label');
    row.className = 'unit-row';
    row.innerHTML = `<span class="unit-name">${u.te}<small>${u.en}</small></span>`;
    let inputs, get, set;
    if (u.pair) {
      const p = ftInPair();
      row.append(p.wrap);
      inputs = [p.ft, p.inch];
      get = () => ftInToInches(parseNum(p.ft.value), parseNum(p.inch.value)) * u.f;
      set = base => {
        const [ft, inch] = isNaN(base) ? ['', ''] : inchesToFtIn(base / u.f);
        show(p.ft, ft === '' ? '' : ft.toLocaleString('en-IN'));
        show(p.inch, String(inch));
      };
    } else {
      const inp = numInput();
      row.append(inp);
      inputs = [inp];
      get = () => parseNum(inp.value) * u.f;
      set = base => show(inp, isNaN(base) ? '' : fmt(base / u.f));
    }
    inputs.forEach(inp => inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0)));
    list.append(row);
    return { row, inputs, get, set };
  });

  rows.forEach((r, i) => {
    r.inputs.forEach(inp => inp.addEventListener('input', () => {
      cleanNumInput(inp);
      const base = r.get();
      rows.forEach((o, j) => {
        o.row.classList.toggle('src', j === i && !isNaN(base));
        if (j !== i) o.set(base);
      });
    }));
  });

  $('.clear', root).addEventListener('click', () => {
    const saved = rows.map(r => ({ vals: r.inputs.map(i => i.value), src: r.row.classList.contains('src') }));
    if (!saved.some(s => s.vals.some(Boolean))) return;
    rows.forEach(r => { r.set(NaN); r.row.classList.remove('src'); });
    toast(CLEARED, () => rows.forEach((r, i) => {
      r.inputs.forEach((inp, k) => { inp.value = saved[i].vals[k]; });
      r.row.classList.toggle('src', saved[i].src);
    }));
  });
}

// ---------- plot ----------

const SHAPES = {
  rect: {
    fields: [['l', 'పొడవు', '1'], ['w', 'వెడల్పు', '2']],
    hint: 'నాలుగు మూలలూ సరిగ్గా లంబకోణం (90°) అయితేనే దీన్ని వాడండి. లేకపోతే <b>4 వైపులు</b> ఎంచుకోండి.',
    sample: { l: 40, w: 30 },
  },
  quad: {
    fields: [['a', 'వైపు 1', '1'], ['b', 'వైపు 2', '2'], ['c', 'వైపు 3', '3'], ['d', 'వైపు 4', '4'], ['e', 'కర్ణం', 'క']],
    hint: 'బొమ్మలో ఉన్నట్లు 1, 2, 3, 4 వైపులు వరుసగా కొలవండి. ఒక మూల నుండి ఎదురు మూలకు (<b>కర్ణం</b>) కూడా కొలవండి — అది లేకుండా సరైన విస్తీర్ణం రాదు.',
    sample: { a: 40, b: 32, c: 44, d: 30, e: 52 },
  },
  tri: {
    fields: [['a', 'వైపు 1', '1'], ['b', 'వైపు 2', '2'], ['c', 'వైపు 3', '3']],
    hint: 'మూడు వైపులూ కొలవండి.',
    sample: { a: 40, b: 34, c: 30 },
  },
};

function initPlot() {
  const state = { shape: 'rect', unit: 'ft', active: null, vals: { rect: {}, quad: {}, tri: {} } };
  const svg = $('#plot-svg'), fieldsEl = $('#plot-fields'), errEl = $('#plot-error');

  const rows = $('#plot-rows');
  const resultCells = AREA_UNITS.map(u => {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `<span>${u.te}</span><b>—</b>`;
    rows.append(row);
    return $('b', row);
  });

  function draw(shape, v, real) {
    let g = plotGeometry(shape, v);
    if (g.pts.some(p => p.some(c => !Number.isFinite(c)))) g = plotGeometry(shape, SHAPES[shape].sample);

    const W = 320, H = 220, pad = 30;
    const xs = g.pts.map(p => p[0]), ys = g.pts.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const w = Math.max(...xs) - minX || 1, h = Math.max(...ys) - minY || 1;
    const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
    const P = g.pts.map(([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s]);
    const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
    const cy = P.reduce((a, p) => a + p[1], 0) / P.length;

    const line = (cls, [i, j, , k]) =>
      `<line class="${cls}" data-k="${k}" x1="${P[i][0]}" y1="${P[i][1]}" x2="${P[j][0]}" y2="${P[j][1]}"/>`;
    // the larger clear circle is a finger-sized tap target
    const badge = (x, y, label, k, cls = '') =>
      `<g class="bdg ${cls}" data-k="${k}"><circle class="hit-c" cx="${x}" cy="${y}" r="22"/>` +
      `<circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y}">${label}</text></g>`;

    const all = g.diag ? [...g.edges, g.diag] : g.edges;
    let out = `<polygon class="poly" points="${P.map(p => p.join(',')).join(' ')}"/>`;
    if (g.diag) out += line('diag', g.diag);
    out += g.edges.map(e => line('edge', e)).join('');
    out += P.map(([x, y]) => `<circle class="vtx" cx="${x}" cy="${y}" r="4.5"/>`).join('');
    out += all.map(e => line('hit', e)).join('');
    for (const [i, j, label, k] of g.edges) {
      const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
      const dx = mx - cx, dy = my - cy, len = Math.hypot(dx, dy) || 1;
      out += badge(mx + dx / len * 17, my + dy / len * 17, label, k);
    }
    if (g.diag) {
      const [i, j, label, k] = g.diag;
      out += badge((P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2, label, k, 'd');
    }
    svg.innerHTML = out;
    svg.classList.toggle('ghost', !real);
    setActive(state.active);
  }

  // lights up one side in the picture and its measurement box
  function setActive(k) {
    state.active = k;
    $$('[data-k]', svg).forEach(el => el.classList.toggle('on', el.dataset.k === k));
    $$('.field-row', fieldsEl).forEach(r => r.classList.toggle('on', r.dataset.k === k));
  }

  // value of one side in the chosen unit
  function sideValue(k) {
    const val = state.vals[state.shape][k];
    if (!val) return NaN;
    if (state.unit === 'ft') return ftInToInches(parseNum(val.main), parseNum(val.inch)) / 12;
    return parseNum(val.main);
  }

  function compute() {
    const { shape, unit } = state;
    const v = {};
    let complete = true;
    for (const [k] of SHAPES[shape].fields) {
      v[k] = sideValue(k);
      if (!(v[k] > 0)) complete = false;
    }
    const area = complete ? plotArea(shape, v) : NaN;
    const ok = complete && area > 0;
    errEl.hidden = !complete || ok;
    draw(shape, v, ok);
    const sqft = area * LEN_TO_FT[unit] ** 2;
    $('#plot-result').classList.toggle('empty', !ok);
    AREA_UNITS.forEach((u, i) => setText(resultCells[i], ok ? fmt(sqft / u.f) : '—'));
  }

  function renderFields() {
    fieldsEl.innerHTML = '';
    for (const [k, label, num] of SHAPES[state.shape].fields) {
      const row = document.createElement('label');
      row.className = 'field-row';
      row.dataset.k = k;
      const isDiag = k === 'e';
      row.innerHTML = `<span class="badge${isDiag ? ' d' : ''}">${num}</span>` +
        `<span class="field-name">${label}${isDiag ? '<small>మూల నుండి ఎదురు మూలకు</small>' : ''}</span>`;
      const val = state.vals[state.shape][k] ||= { main: '', inch: '' };
      const bind = (inp, key) => {
        inp.value = val[key];
        inp.addEventListener('input', () => { val[key] = cleanNumInput(inp); compute(); });
      };
      if (state.unit === 'ft') {
        const p = ftInPair();
        bind(p.ft, 'main');
        bind(p.inch, 'inch');
        row.append(p.wrap);
      } else {
        const inp = numInput();
        bind(inp, 'main');
        const tag = document.createElement('span');
        tag.className = 'unit-tag';
        tag.textContent = LEN_SHORT[state.unit];
        row.append(inp, tag);
      }
      fieldsEl.append(row);
    }
    $('#shape-hint').innerHTML = SHAPES[state.shape].hint;
    compute();
  }

  segmented($('#shape-picker'), v => { state.shape = v; renderFields(); });
  segmented($('#plot-unit'), v => { state.unit = v; renderFields(); });
  $('#plot-clear').addEventListener('click', () => {
    const { shape } = state, saved = state.vals[shape];
    if (!Object.values(saved).some(v => v.main || v.inch)) return;
    state.vals[shape] = {};
    renderFields();
    toast(CLEARED, () => {
      state.vals[shape] = saved;
      if (state.shape === shape) renderFields();
    });
  });

  svg.addEventListener('click', e => {
    const t = e.target.closest('[data-k]');
    if (t) $(`.field-row[data-k="${t.dataset.k}"] input`, fieldsEl).focus();
  });
  fieldsEl.addEventListener('focusin', e => setActive(e.target.closest('.field-row').dataset.k));
  fieldsEl.addEventListener('focusout', e => { if (!fieldsEl.contains(e.relatedTarget)) setActive(null); });

  // photo is only shown on screen for reference; it never leaves the phone
  const photoInput = $('#photo-input'), photoBtn = $('#photo-btn'), preview = $('#photo-preview');
  const img = $('#photo-img'), viewer = $('#viewer'), viewerImg = $('#viewer-img');
  let photoUrl = null;
  photoBtn.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(file);
    img.src = viewerImg.src = photoUrl;
    preview.hidden = false;
    photoBtn.hidden = true;
    photoInput.value = '';
  });
  $('#photo-remove').addEventListener('click', () => {
    URL.revokeObjectURL(photoUrl);
    photoUrl = null;
    img.removeAttribute('src');
    preview.hidden = true;
    photoBtn.hidden = false;
  });
  img.addEventListener('click', () => { viewer.hidden = false; });
  viewer.addEventListener('click', () => { viewer.hidden = true; });

  renderFields();
}

// ---------- calculator ----------

function initCalc() {
  const exprEl = $('#calc-expr'), previewEl = $('#calc-preview');
  let expr = '', done = false;

  function render() {
    exprEl.textContent = expr ? prettyExpr(expr) : '0';
    const len = exprEl.textContent.length;
    exprEl.classList.toggle('long', len > 11 && len <= 18);
    exprEl.classList.toggle('xlong', len > 18);
    previewEl.classList.remove('err');
    previewEl.textContent = '';
    if (done || !/\d[+−×÷%]/.test(expr)) return;
    const r = evaluate(expr);
    if (r === null) return;
    if (!Number.isFinite(r)) { previewEl.textContent = 'సున్నాతో భాగించలేం'; previewEl.classList.add('err'); return; }
    previewEl.textContent = '= ' + r.toLocaleString('en-IN', { maximumFractionDigits: 10 });
  }

  function press(k) {
    let e = expr;
    const last = e.slice(-1);
    const cur = e.match(/[\d.]*$/)[0];

    if (k === 'C') e = '';
    else if (k === '⌫') e = done ? '' : e.slice(0, -1);
    else if (k === '=') {
      const r = evaluate(e);
      if (r === null) return;
      if (!Number.isFinite(r) || Math.abs(r) >= 1e15) { render(); previewEl.textContent = 'సున్నాతో భాగించలేం'; previewEl.classList.add('err'); return; }
      expr = numToExpr(r);
      done = true;
      render();
      flash(exprEl);
      return;
    } else if (/^\d+$/.test(k)) {
      if (done) e = '';
      if (last === '%') e += '×';
      const digits = done ? '' : cur;
      if (digits.replace('.', '').length >= 15) return;
      if (digits === '0') { e = e.slice(0, -1); if (k === '00') k = '0'; }
      if (digits === '' && k === '00') k = '0';
      e += k;
    } else if (k === '.') {
      if (done) e = '';
      if (last === '%') e += '×';
      const c = done ? '' : cur;
      if (c.includes('.')) return;
      e += c === '' ? '0.' : '.';
    } else if (OPS.includes(k)) {
      if (e === '' || e === '−') e = k === '−' ? '−' : '';
      else if (OPS.includes(last) || last === '.') e = e.slice(0, -1) + k;
      else e += k;
    } else if (k === '%') {
      if (/\d/.test(last)) e += '%';
    }
    done = false;
    expr = e;
    render();
  }

  $('#keypad').addEventListener('click', e => {
    const b = e.target.closest('.key');
    if (b) press(b.dataset.k);
  });

  const KEYS = { '-': '−', '*': '×', 'x': '×', '/': '÷', Enter: '=', Backspace: '⌫', Escape: 'C', Delete: 'C' };
  document.addEventListener('keydown', e => {
    if (!$('#calc').classList.contains('active') || e.target.matches('input') || e.ctrlKey || e.metaKey) return;
    const k = KEYS[e.key] || e.key;
    if (/^[\d.%=+−×÷C⌫]$/.test(k)) { e.preventDefault(); press(k); }
  });

  render();
}

// ---------- interest ----------

function initInterest() {
  const s = { kind: 'interest', mode: 'rupee', time: 'dur', compound: false, perYear: 1 };
  const P = enhanceNum($('#int-p')), R = enhanceNum($('#int-r'));
  const Y = enhanceNum($('#int-y')), M = enhanceNum($('#int-m')), D = enhanceNum($('#int-d'));
  const from = $('#int-from'), to = $('#int-to');
  const out = { interest: $('#int-interest'), total: $('#int-total'), monthly: $('#int-monthly'), period: $('#int-period') };

  const todayISO = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  const parseDate = v => {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  to.value = todayISO();

  function compute() {
    const p = parseNum(P.value), r = parseNum(R.value);
    const annual = s.mode === 'rupee' ? r * 12 : r;

    const hint = $('#int-r-hint');
    if (!(r > 0)) hint.innerHTML = s.mode === 'rupee'
      ? 'ఉదా: "2 రూపాయల వడ్డీ" అంటే నెలకు ₹100 కి ₹2'
      : 'ఉదా: 24% అంటే ఏడాదికి ₹100 కి ₹24';
    else hint.innerHTML = s.mode === 'rupee'
      ? `= ఏడాదికి <b>${fmt(annual)}%</b>`
      : `= నెలకు ₹100 కి <b>₹${fmt(r / 12)}</b> వడ్డీ`;

    if (s.kind === 'emi') {
      const n = Math.round((parseNum(Y.value) || 0) * 12 + (parseNum(M.value) || 0));
      const ok = p > 0 && r >= 0 && n > 0;
      const emi = ok ? emiFor(p, annual, n) : NaN;
      $('#emi-result').classList.toggle('empty', !ok);
      setText($('#emi-amount'), ok ? fmtRs(emi) : '—');
      setText($('#emi-interest'), ok ? fmtRs(emi * n - p) : '—');
      setText($('#emi-total'), ok ? fmtRs(emi * n) : '—');
      setText($('#emi-count'), n > 0 ? `${n} నెలలు` : '—');
      return;
    }

    let ymd;
    if (s.time === 'dur') {
      ymd = { y: parseNum(Y.value) || 0, m: parseNum(M.value) || 0, d: parseNum(D.value) || 0 };
    } else {
      const a = parseDate(from.value), b = parseDate(to.value);
      ymd = a && b ? diffYMD(a, b) : null;
    }
    const months = ymd ? ymd.y * 12 + ymd.m + ymd.d / 30 : 0;
    setText(out.period, ymd && months > 0 ? periodText(ymd) : '—');
    const badDates = s.time === 'dates' && from.value && to.value && !ymd;
    $('#int-result .result-empty').textContent = badDates
      ? 'తేదీలు సరిచూడండి — లెక్క తేదీ, ఇచ్చిన తేదీ తర్వాత ఉండాలి.'
      : 'అసలు, రేటు, కాలం వేస్తే వడ్డీ ఇక్కడ వస్తుంది.';

    $('#int-monthly-row').hidden = s.compound;
    const ok = p > 0 && r > 0 && months > 0;
    $('#int-result').classList.toggle('empty', !ok);
    if (!ok) {
      for (const k of ['interest', 'total', 'monthly']) setText(out[k], '—');
      return;
    }
    const interest = interestFor(p, annual, months, s.compound, s.perYear);
    setText(out.interest, fmtRs(interest));
    setText(out.total, fmtRs(p + interest));
    setText(out.monthly, fmtRs(p * annual / 1200));
  }

  for (const el of [P, R, Y, M, D]) el.addEventListener('input', () => { cleanNumInput(el); compute(); });
  for (const el of [from, to]) el.addEventListener('change', compute);

  segmented($('#int-mode'), v => {
    // keep the same rate when switching how it's written
    const r = parseNum(R.value);
    if (r > 0) R.value = fmt(v === 'percent' ? r * 12 : r / 12).replace(/,/g, '');
    s.mode = v;
    $('#int-r-suffix').textContent = v === 'rupee' ? '₹100 కి, నెలకు' : '% ఏడాదికి';
    compute();
  });
  // EMI always uses years + months, so the date and interest-type choices step aside
  function layout() {
    const emi = s.kind === 'emi';
    $('#int-p-label').textContent = emi ? 'అప్పు మొత్తం (లోన్)' : 'అసలు (ఇచ్చిన / తీసుకున్న డబ్బు)';
    $('#int-time-label').textContent = emi ? 'ఎంత కాలంలో తీర్చాలి?' : 'ఎంత కాలం?';
    $('#int-time').hidden = emi;
    $('#int-d-wrap').hidden = emi;
    $('#int-dur').hidden = !emi && s.time !== 'dur';
    $('#int-dates').hidden = emi || s.time !== 'dates';
    $('#int-type-card').hidden = emi;
    $('#int-result').hidden = emi;
    $('#emi-result').hidden = !emi;
    compute();
  }
  segmented($('#int-kind'), v => { s.kind = v; layout(); });
  segmented($('#int-time'), v => { s.time = v; layout(); });
  segmented($('#int-type'), v => {
    s.compound = v === 'compound';
    $('#int-freq-wrap').hidden = !s.compound;
    compute();
  });
  segmented($('#int-freq'), v => { s.perYear = Number(v); compute(); });

  $('#int-clear').addEventListener('click', () => {
    const fields = [P, R, Y, M, D, from];
    const saved = [...fields, to].map(el => el.value);
    if (!fields.some(el => el.value)) return;
    for (const el of fields) el.value = '';
    to.value = todayISO();
    compute();
    toast(CLEARED, () => {
      [...fields, to].forEach((el, i) => { el.value = saved[i]; });
      compute();
    });
  });

  compute();
}

// ---------- start ----------

function init() {
  initTextSize();
  initTabs();
  initConverter($('#area'), AREA_UNITS);
  initConverter($('#length'), LENGTH_UNITS);
  initConverter($('#weight'), WEIGHT_UNITS);
  initPlot();
  initCalc();
  initInterest();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
}

if (typeof document !== 'undefined') init();
