/* 입력 위젯(필드) 모음. build(f, init) → {el, get(), valid()}  /  sample(f, r, i) → 가짜 응답 */
(function () {
  const ST = window.ST; const { h, s, PAL } = ST;
  const T = (ST.fieldTypes = {});
  const opts = (f) => (f.options || []).map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
  const label = (f) => (f.label ? h('div', { class: 'f-label' }, f.label, f.hint ? h('span', { class: 'f-hint' }, f.hint) : null) : null);
  const wrapField = (f, ...kids) => h('div', { class: 'field f-' + f.type }, label(f), ...kids);

  /* 슬라이더 묶음 */
  T.sliders = {
    build(f, init) {
      const min = f.min ?? 0, max = f.max ?? 10; const vals = {}; const rows = [];
      f.items.forEach((it) => {
        vals[it.k] = init && init[it.k] != null ? init[it.k] : Math.round((min + max) / 2);
        const out = h('output', { class: 'sl-out' }, String(vals[it.k]));
        const inp = h('input', { type: 'range', min, max, step: 1, value: vals[it.k], 'aria-label': it.l, oninput: () => { vals[it.k] = +inp.value; out.textContent = inp.value; } });
        rows.push(h('label', { class: 'sl-row' }, h('span', { class: 'sl-l' }, it.l, it.d ? h('small', {}, it.d) : null), inp, out));
      });
      return { el: wrapField(f, h('div', { class: 'sliders' }, rows, h('div', { class: 'sl-scale' }, h('span', {}, f.lo || String(min)), h('span', {}, f.hi || String(max))))), get: () => ({ ...vals }), valid: () => true };
    },
    sample(f, r) {
      const min = f.min ?? 0, max = f.max ?? 10; const o = {}; const bias = r.norm() * 1.2;
      f.items.forEach((it) => { const base = (it.mean ?? (min + max) * 0.55); o[it.k] = Math.max(min, Math.min(max, Math.round(base + bias + r.norm() * 2.6))); });
      return o;
    }
  };

  /* 단일 선택 */
  T.choice = {
    build(f, init) {
      let val = init || null; const bs = [];
      const paint = () => bs.forEach((b) => { const on = b.dataset.v === val; b.setAttribute('aria-checked', on); b.classList.toggle('on', on); });
      opts(f).forEach((o) => { const b = h('button', { type: 'button', role: 'radio', class: 'pill', 'data-v': o.v, onclick: () => { val = o.v; paint(); } }, o.l); bs.push(b); });
      paint();
      return { el: wrapField(f, h('div', { class: 'pills', role: 'radiogroup', 'aria-label': f.label || '' }, bs)), get: () => val, valid: () => !!val || f.optional };
    },
    sample(f, r) { const o = opts(f); const w = r() < 0.5 ? o.slice(0, Math.ceil(o.length / 2)) : o; return r.pick(w).v; }
  };

  /* 복수 선택 */
  T.multi = {
    build(f, init) {
      let val = Array.isArray(init) ? init.slice() : []; const bs = []; const note = h('span', { class: 'f-count' });
      const paint = () => { bs.forEach((b) => { const on = val.includes(b.dataset.v); b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); }); note.textContent = f.max ? `${val.length}/${f.max}` : `${val.length}개`; };
      opts(f).forEach((o) => bs.push(h('button', { type: 'button', class: 'pill', 'data-v': o.v, onclick: () => { if (val.includes(o.v)) val = val.filter((x) => x !== o.v); else if (!f.max || val.length < f.max) val.push(o.v); paint(); } }, o.l)));
      paint();
      return { el: wrapField(f, h('div', { class: 'pills' }, bs), note), get: () => val.slice(), valid: () => val.length > 0 };
    },
    sample(f, r) { const o = opts(f).map((x) => x.v); const n = r.int(1, f.max || 3); const out = []; while (out.length < Math.min(n, o.length)) { const v = r.pick(o); if (!out.includes(v)) out.push(v); } return out; }
  };

  /* 한 줄/여러 줄 글 */
  T.text = {
    build(f, init) {
      const el = f.rows > 1 ? h('textarea', { rows: f.rows, maxlength: f.max || 200, placeholder: f.ph || '' }) : h('input', { type: 'text', maxlength: f.max || 80, placeholder: f.ph || '' });
      el.value = init || ''; el.setAttribute('aria-label', f.label || f.ph || '입력');
      return { el: wrapField(f, el), get: () => el.value.trim(), valid: () => f.optional || el.value.trim().length > 0 };
    },
    sample(f, r) { return r.pick(f.samples || ['…']); }
  };

  /* 여러 개의 짧은 글 */
  T.texts = {
    build(f, init) {
      const ins = []; const n = f.n || 3;
      for (let i = 0; i < n; i++) {
        const inp = h('input', { type: 'text', maxlength: f.max || 40, placeholder: f.ph || (f.labels ? '' : `${i + 1}`), 'aria-label': f.labels ? f.labels[i] : `${i + 1}번째` });
        inp.value = (init && init[i]) || ''; ins.push(inp);
      }
      const rows = ins.map((inp, i) => h('label', { class: 'tx-row' }, h('span', { class: 'tx-n' }, f.labels ? f.labels[i] : String(i + 1)), inp));
      return {
        el: wrapField(f, h('div', { class: 'texts' }, rows)),
        get: () => (f.keep ? ins.map((i) => i.value.trim()) : ins.map((i) => i.value.trim()).filter(Boolean)),
        valid: () => ins.filter((i) => i.value.trim()).length >= (f.min || 1)
      };
    },
    sample(f, r) {
      const n = f.n || 3; const pool = f.samples || ['…']; const out = []; const used = new Set();
      for (let i = 0; i < n; i++) { let v = r.pick(pool); let g = 0; while (used.has(v) && g++ < 12) v = r.pick(pool); used.add(v); out.push(v); }
      return f.keep ? out : out.slice(0, r.int(Math.min(2, n), n));
    }
  };

  /* 2차원 패드 */
  T.pad = {
    build(f, init) {
      let val = init || null; const dot = h('div', { class: 'pad-dot', hidden: !val });
      const place = () => { if (val) { dot.hidden = false; dot.style.left = val.x + '%'; dot.style.top = 100 - val.y + '%'; } };
      const area = h('div', { class: 'pad', role: 'application', 'aria-label': `${f.xLabel} / ${f.yLabel} 위치 선택`, tabindex: 0 },
        h('span', { class: 'pad-ax pad-x' }, f.xLabel + ' →'), h('span', { class: 'pad-ax pad-y' }, '↑ ' + f.yLabel),
        h('span', { class: 'pad-q q1' }, f.q && f.q[0]), h('span', { class: 'pad-q q2' }, f.q && f.q[1]), h('span', { class: 'pad-q q3' }, f.q && f.q[2]), h('span', { class: 'pad-q q4' }, f.q && f.q[3]), dot);
      const set = (e) => { const r = area.getBoundingClientRect(); val = { x: Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))), y: Math.round(Math.max(0, Math.min(100, 100 - ((e.clientY - r.top) / r.height) * 100))) }; place(); };
      area.addEventListener('pointerdown', (e) => { area.setPointerCapture(e.pointerId); set(e); area.onpointermove = set; });
      area.addEventListener('pointerup', () => { area.onpointermove = null; });
      area.addEventListener('keydown', (e) => { const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key]; if (!d) return; e.preventDefault(); val = val || { x: 50, y: 50 }; val = { x: Math.max(0, Math.min(100, val.x + d[0])), y: Math.max(0, Math.min(100, val.y + d[1])) }; place(); });
      place();
      return { el: wrapField(f, area, h('div', { class: 'f-hint2' }, '칸을 눌러 위치를 표시하세요 (방향키도 가능)')), get: () => val, valid: () => !!val };
    },
    sample(f, r) { return { x: Math.max(6, Math.min(94, Math.round(42 + r.norm() * 55))), y: Math.max(6, Math.min(94, Math.round(54 + r.norm() * 50))) }; }
  };

  /* 행×선택지 표 */
  T.matrix = {
    build(f, init) {
      const val = Object.assign({}, init || {}); const table = h('div', { class: 'matrix', role: 'table' });
      f.rows.forEach((row) => {
        const bs = [];
        const paint = () => bs.forEach((b) => { const on = val[row.k] === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        const group = h('div', { class: 'pills small' }, opts(f).map((o) => { const b = h('button', { type: 'button', class: 'pill', 'data-v': o.v, onclick: () => { val[row.k] = o.v; paint(); } }, o.l); bs.push(b); return b; }));
        paint(); table.appendChild(h('div', { class: 'mx-row' }, h('div', { class: 'mx-l' }, row.l), group));
      });
      return { el: wrapField(f, table), get: () => ({ ...val }), valid: () => f.rows.every((r) => val[r.k]) };
    },
    sample(f, r) { const o = {}; const ov = opts(f); f.rows.forEach((row) => { const w = row.fav ? (r() < 0.55 ? row.fav : r.pick(ov).v) : r.pick(ov).v; o[row.k] = w; }); return o; }
  };

  /* 그리기 도구 */
  const COLORS = [[PAL.ink, '먹'], [PAL.blue, '파랑'], [PAL.pink, '분홍'], [PAL.mint, '초록'], [PAL.amber, '주황']];
  T.draw = {
    build(f, init) {
      const W = ST.DRAW_W, H = ST.DRAW_H; const ops = init && init.ops ? JSON.parse(JSON.stringify(init.ops)) : [];
      let tool = 'pen', color = PAL.ink, width = 4, word = (init && init.word) || (f.words && f.words[0]) || null;
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'canvas', role: 'img', 'aria-label': '그리기 영역', style: { touchAction: 'none' } });
      svg.appendChild(s('rect', { width: W, height: H, fill: '#fff' }));
      const layer = s('g'); svg.appendChild(layer);
      const redraw = () => { layer.replaceChildren(...ops.map(ST.opNode)); };
      redraw();
      const textIn = h('input', { type: 'text', class: 'tool-text', maxlength: 20, placeholder: '글자를 쓰고 그림판을 누르세요', 'aria-label': '배치할 글자' });
      const tools = [['pen', '펜', 'pencil'], ['hl', '형광펜', null], ['line', '선', null], ['circle', '원', null], ['square', '사각형', null], ['triangle', '삼각형', null], ['dot', '점', null], ['text', '글자', null]];
      const tb = []; const toolBar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': '그리기 도구' });
      const glyph = { pen: 'M4 20l1-4L17 4l3 3L8 19zM14 7l3 3', hl: 'M5 20h14M8 16l9-9 3 3-9 9H8z', line: 'M5 19L19 5', circle: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', square: 'M4 4h16v16H4z', triangle: 'M12 4l9 16H3z', dot: 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0', text: 'M5 6h14M12 6v13M9 19h6' };
      const paintTools = () => tb.forEach((b) => { const on = b.dataset.t === tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      tools.forEach(([id, name]) => { const b = h('button', { type: 'button', class: 'tool', 'data-t': id, title: name, onclick: () => { tool = id; paintTools(); } }, ST.s('svg', { viewBox: '0 0 24 24', width: 20, height: 20, fill: id === 'dot' ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ST.s('path', { d: glyph[id] })), h('span', {}, name)); tb.push(b); toolBar.appendChild(b); });
      paintTools();
      const cb = []; const colorBar = h('div', { class: 'colors', role: 'group', 'aria-label': '색' });
      const paintC = () => cb.forEach((b) => { const on = b.dataset.c === color; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      COLORS.forEach(([c, n]) => { const b = h('button', { type: 'button', class: 'swatch', 'data-c': c, title: n, 'aria-label': n, style: { background: c }, onclick: () => { color = c; paintC(); } }); cb.push(b); colorBar.appendChild(b); });
      paintC();
      const wsel = h('select', { 'aria-label': '굵기', onchange: () => { width = +wsel.value; } }, [[2, '가늘게'], [4, '보통'], [8, '굵게']].map(([v, l]) => h('option', { value: v, selected: v === 4 }, l)));
      const undo = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ops.pop(); redraw(); } }, ST.icon('undo', 16), '되돌리기');
      const clear = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ops.length = 0; redraw(); } }, ST.icon('trash', 16), '지우기');

      let cur = null, curNode = null, sx = 0, sy = 0;
      const pt = (e) => { const r = svg.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) * W) / r.width), Math.round(((e.clientY - r.top) * H) / r.height)]; };
      const shape = (x, y) => {
        const x0 = Math.min(sx, x), y0 = Math.min(sy, y), w2 = Math.abs(x - sx), h2 = Math.abs(y - sy);
        if (tool === 'line') return { t: 'l', c: color, w: width, x1: sx, y1: sy, x2: x, y2: y };
        if (tool === 'circle') return { t: 'c', c: color, w: width, cx: Math.round(x0 + w2 / 2), cy: Math.round(y0 + h2 / 2), rx: Math.round(w2 / 2), ry: Math.round(h2 / 2) };
        if (tool === 'square') return { t: 'r', c: color, w: width, x: x0, y: y0, w2, h2 };
        return { t: 'g', c: color, w: width, x: x0, y: y0, w2, h2 };
      };
      svg.addEventListener('pointerdown', (e) => {
        e.preventDefault(); svg.setPointerCapture(e.pointerId); const [x, y] = pt(e); sx = x; sy = y;
        if (tool === 'dot') { cur = { t: 'd', c: color, cx: x, cy: y, r: Math.max(3, width * 1.5) }; }
        else if (tool === 'text') { const t = textIn.value.trim(); if (!t) { textIn.focus(); cur = null; return; } cur = { t: 't', c: color, x, y, s: t, z: 18 + width * 3 }; }
        else if (tool === 'pen' || tool === 'hl') cur = tool === 'hl' ? { t: 'p', c: color, w: 18, a: 0.45, q: [x, y] } : { t: 'p', c: color, w: width, q: [x, y] };
        else cur = shape(x, y);
        curNode = ST.opNode(cur); layer.appendChild(curNode);
      });
      svg.addEventListener('pointermove', (e) => {
        if (!cur) return; const [x, y] = pt(e);
        if (cur.t === 'p') { const q = cur.q; const dx = x - q[q.length - 2], dy = y - q[q.length - 1]; if (dx * dx + dy * dy < 4) return; q.push(x, y); }
        else if (['l', 'c', 'r', 'g'].includes(cur.t)) cur = shape(x, y);
        else return;
        const n = ST.opNode(cur); layer.replaceChild(n, curNode); curNode = n;
      });
      const end = () => { if (!cur) return; if (ops.length < 400) ops.push(cur); cur = null; curNode = null; redraw(); };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);

      const wordBar = f.words ? h('div', { class: 'pills small words', role: 'radiogroup', 'aria-label': '주제 낱말' }, f.words.map((w) => h('button', { type: 'button', class: 'pill' + (w === word ? ' on' : ''), role: 'radio', 'aria-checked': w === word, onclick: (e) => { word = w; e.currentTarget.parentNode.querySelectorAll('.pill').forEach((b) => { const on = b.textContent === w; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); } }, w))) : null;
      return {
        el: wrapField(f, wordBar, h('div', { class: 'draw-wrap' }, h('div', { class: 'draw-bar' }, toolBar, h('div', { class: 'draw-bar2' }, colorBar, wsel, textIn, undo, clear)), svg)),
        get: () => ({ ops: JSON.parse(JSON.stringify(ops)), word }), valid: () => ops.length > 0
      };
    },
    sample(f, r) {
      const ops = []; const word = f.words ? r.pick(f.words) : null; const c = () => r.pick([PAL.ink, PAL.blue, PAL.pink, PAL.mint, PAL.amber]);
      const n = r.int(3, 6);
      for (let i = 0; i < n; i++) {
        const k = r.int(0, 5); const x = r.int(60, 440), y = r.int(50, 260), w2 = r.int(40, 130), h2 = r.int(40, 110);
        if (k === 0) ops.push({ t: 'c', c: c(), w: 4, cx: x + w2 / 2, cy: y + h2 / 2, rx: w2 / 2, ry: h2 / 2 });
        else if (k === 1) ops.push({ t: 'r', c: c(), w: 4, x, y, w2, h2 });
        else if (k === 2) ops.push({ t: 'g', c: c(), w: 4, x, y, w2, h2 });
        else if (k === 3) ops.push({ t: 'l', c: c(), w: 4, x1: x, y1: y, x2: x + w2, y2: y + h2 });
        else if (k === 4) ops.push({ t: 'd', c: c(), cx: x, cy: y, r: 6 });
        else { const q = []; for (let j = 0; j < 12; j++) q.push(Math.round(x + j * 9), Math.round(y + Math.sin(j / 1.5 + i) * 22)); ops.push({ t: 'p', c: c(), w: 4, q }); }
      }
      if (word) ops.push({ t: 't', c: PAL.ink, x: r.int(150, 330), y: r.int(320, 360), s: word, z: 34 });
      return { ops, word };
    }
  };

  /* 마인드맵 만들기 */
  const MARKSEQ = ['', 'star', 'question', 'warn', 'bolt', 'check'];
  T.mindmap = {
    build(f, init) {
      const nb = f.branches || 5, nl = 3; const center = h('input', { type: 'text', maxlength: 14, placeholder: f.centerPh || '중심 주제', 'aria-label': '중심 주제', class: 'mm-center' });
      center.value = (init && init.c) || f.center || '';
      const preview = h('div', { class: 'mm-preview' }); const branches = [];
      const refresh = () => { preview.replaceChildren(ST.mindmapSVG(read())); };
      let tm; const later = () => { clearTimeout(tm); tm = setTimeout(refresh, 120); };
      center.addEventListener('input', later);
      const rows = [];
      for (let i = 0; i < nb; i++) {
        const ib = init && init.b && init.b[i]; const bi = h('input', { type: 'text', maxlength: 10, placeholder: `가지 ${i + 1}`, 'aria-label': `가지 ${i + 1}`, class: 'mm-branch', oninput: later }); bi.value = (ib && ib.t) || '';
        const leaves = [];
        for (let j = 0; j < nl; j++) {
          const il = ib && ib.l && ib.l[j]; let mk = (il && il.m) || '';
          const li = h('input', { type: 'text', maxlength: 14, placeholder: '세부', 'aria-label': `가지 ${i + 1} 세부 ${j + 1}`, oninput: later }); li.value = (il && il.t) || '';
          const mb = h('button', { type: 'button', class: 'mark-btn', title: '표식 바꾸기 (★핵심 ?질문 ⚠주의 ⚡아이디어 ✔결정)', onclick: () => { mk = MARKSEQ[(MARKSEQ.indexOf(mk) + 1) % MARKSEQ.length]; paint(); later(); } });
          const paint = () => { mb.replaceChildren(mk ? ST.icon(mk, 16) : h('span', {}, '·')); mb.style.color = ST.MARK_COLOR[mk] || '#8a93a3'; mb.setAttribute('aria-label', '표식: ' + (ST.MARKS[mk] || '없음')); };
          paint(); leaves.push({ li, get: () => mk }); rows.push(null);
          leaves[j].el = h('div', { class: 'mm-leaf' }, mb, li);
        }
        branches.push({ bi, leaves });
      }
      function read() {
        return { c: center.value.trim(), b: branches.map((b) => ({ t: b.bi.value.trim(), l: b.leaves.map((l) => ({ t: l.li.value.trim(), m: l.get() })).filter((l) => l.t) })).filter((b) => b.t) };
      }
      const form = h('div', { class: 'mm-form' }, h('div', { class: 'mm-c' }, h('span', {}, '중심'), center), branches.map((b, i) => h('div', { class: 'mm-b', style: { '--bc': ST.SERIES[i % ST.SERIES.length] } }, b.bi, h('div', { class: 'mm-leaves' }, b.leaves.map((l) => l.el)))));
      refresh();
      return { el: wrapField(f, h('div', { class: 'mm-wrap' }, form, preview)), get: read, valid: () => { const v = read(); return v.c && v.b.length >= 2; } };
    },
    sample(f, r) { return r.pick(f.samples); }
  };

  /* 프로세스(단계) 만들기 */
  T.steps = {
    build(f, init) {
      const n = f.n || 6; const title = h('input', { type: 'text', maxlength: 26, placeholder: f.titlePh || '프로세스 이름', class: 'st-title', 'aria-label': '프로세스 이름' }); title.value = (init && init.title) || '';
      const preview = h('div', { class: 'mm-preview' }); const rows = [];
      let tm; const later = () => { clearTimeout(tm); tm = setTimeout(() => preview.replaceChildren(ST.flowSVG(read())), 120); };
      title.addEventListener('input', later);
      const ICONS = ['doc', 'people', 'chat', 'calendar', 'mail', 'check', 'clock', 'bulb', 'key', 'flag', 'chart', 'gear', 'warn', 'question', 'heart', 'book'];
      const ICON_L = { doc: '문서', people: '사람', chat: '대화', calendar: '일정', mail: '메일', check: '확인', clock: '시간', bulb: '아이디어', key: '핵심', flag: '목표', chart: '지표', gear: '실행', warn: '주의', question: '질문', heart: '마음', book: '자료' };
      for (let i = 0; i < n; i++) {
        const it = init && init.s && init.s[i]; let dd = (it && it.d) || '';
        const t = h('input', { type: 'text', maxlength: 30, placeholder: `단계 ${i + 1}`, 'aria-label': `단계 ${i + 1} 내용`, oninput: later }); t.value = (it && it.t) || '';
        const sel = h('select', { 'aria-label': `단계 ${i + 1} 아이콘`, onchange: later }, ICONS.map((k) => h('option', { value: k, selected: ((it && it.i) || ICONS[i % ICONS.length]) === k }, ICON_L[k])));
        const db = h('button', { type: 'button', class: 'dd-btn', onclick: () => { dd = dd === '' ? 'do' : dd === 'do' ? 'dont' : ''; paint(); later(); } });
        const paint = () => { db.textContent = dd === 'do' ? '✔ Do' : dd === 'dont' ? '✖ Don’t' : '–'; db.className = 'dd-btn ' + dd; db.setAttribute('aria-label', '구분: ' + (dd === 'do' ? '해야 할 일' : dd === 'dont' ? '하지 말 일' : '일반')); };
        paint(); rows.push({ t, sel, get: () => dd, el: h('div', { class: 'st-row' }, h('span', { class: 'tx-n' }, String(i + 1)), sel, t, db) });
      }
      function read() { return { title: title.value.trim(), s: rows.map((r) => ({ t: r.t.value.trim(), i: r.sel.value, d: r.get() })).filter((x) => x.t) }; }
      preview.replaceChildren(ST.flowSVG(read()));
      return { el: wrapField(f, h('div', { class: 'mm-wrap' }, h('div', { class: 'st-form' }, title, rows.map((r) => r.el), h('div', { class: 'f-hint2' }, '오른쪽 끝 버튼: 해야 할 일(✔) · 하지 말 일(✖) 표시')), preview)), get: read, valid: () => { const v = read(); return v.title && v.s.length >= 3; } };
    },
    sample(f, r) { return r.pick(f.samples); }
  };

  /* 할 일 목록 */
  ST.STATUS = { todo: ['대기', 'wait', PAL.slate], doing: ['진행', 'play', PAL.blue], done: ['완료', 'check', PAL.mint], stuck: ['막힘', 'blocked', PAL.pink] };
  T.tasks = {
    build(f, init) {
      const n = f.n || 5; const rows = []; const order = ['todo', 'doing', 'done', 'stuck'];
      for (let i = 0; i < n; i++) {
        const it = (init && init[i]) || {}; let st = it.s || 'todo', pr = !!it.p;
        const t = h('input', { type: 'text', maxlength: 28, placeholder: `할 일 ${i + 1}`, 'aria-label': `할 일 ${i + 1}` }); t.value = it.t || '';
        const sb = h('button', { type: 'button', class: 'st-btn', onclick: () => { st = order[(order.indexOf(st) + 1) % 4]; paint(); } });
        const pb = h('button', { type: 'button', class: 'pr-btn', onclick: () => { pr = !pr; paint(); } }, ST.icon('star', 18));
        const paint = () => { const [l, ic, col] = ST.STATUS[st]; sb.replaceChildren(ST.icon(ic, 16), h('span', {}, l)); sb.style.color = col; sb.style.borderColor = col; pb.classList.toggle('on', pr); pb.setAttribute('aria-pressed', pr); pb.setAttribute('aria-label', '중요 표시'); };
        paint(); rows.push({ t, get: () => ({ t: t.value.trim(), s: st, p: pr }), el: h('div', { class: 'task-row' }, pb, t, sb) });
      }
      return { el: wrapField(f, h('div', { class: 'tasks' }, rows.map((r) => r.el), h('div', { class: 'f-hint2' }, '상태 버튼을 누르면 대기 → 진행 → 완료 → 막힘 순서로 바뀝니다. ★은 오늘의 최우선 표시.'))), get: () => rows.map((r) => r.get()).filter((x) => x.t), valid: () => rows.some((r) => r.t.value.trim()) };
    },
    sample(f, r) { const n = r.int(3, f.n || 5); const out = []; const pool = f.samples; const used = new Set(); while (out.length < n) { const t = r.pick(pool); if (used.has(t)) continue; used.add(t); out.push({ t, s: r.pick(['todo', 'todo', 'doing', 'doing', 'done', 'stuck']), p: r() < 0.25 }); } return out; }
  };


  /* 노트 연결망 만들기 (노트 몇 장을 쓰고 서로 잇기) */
  T.netgraph = {
    build(f, init) {
      const n = f.n || 5; const ins = []; const edges = new Set(); const chips = [];
      if (init && init.n) { init.n.forEach((t, i) => { if (i < n) ins[i] = t; }); (init.e || []).forEach(([a, b]) => edges.add(Math.min(a, b) + '-' + Math.max(a, b))); }
      const preview = h('div', { class: 'mm-preview' });
      const read = () => {
        const idx = []; const labels = []; ins.forEach((inp, i) => { const t = (inp.value || '').trim(); if (t) { idx[i] = labels.length; labels.push(t); } });
        const e = []; edges.forEach((k) => { const [a, b] = k.split('-').map(Number); if (idx[a] != null && idx[b] != null) e.push([idx[a], idx[b]]); });
        return { n: labels, e };
      };
      let tm; const later = () => { clearTimeout(tm); tm = setTimeout(() => preview.replaceChildren(ST.netSVG(read())), 120); };
      const paint = () => { chips.forEach((c) => { const on = edges.has(c.k); c.b.classList.toggle('on', on); c.b.setAttribute('aria-pressed', on); }); later(); };
      const rows = [];
      for (let i = 0; i < n; i++) {
        const inp = h('input', { type: 'text', maxlength: 16, placeholder: f.ph || `노트 ${i + 1}의 핵심 아이디어`, 'aria-label': `노트 ${i + 1} 제목`, oninput: later }); inp.value = ins[i] || ''; ins[i] = inp;
        const links = h('div', { class: 'ng-links' }, h('span', { class: 'ng-lab' }, '연결'));
        for (let j = 0; j < n; j++) { if (j === i) continue; const k = Math.min(i, j) + '-' + Math.max(i, j); const b = h('button', { type: 'button', class: 'ng-chip', 'aria-label': `노트 ${i + 1}과 노트 ${j + 1} 연결`, onclick: () => { if (edges.has(k)) edges.delete(k); else edges.add(k); paint(); } }, String(j + 1)); chips.push({ k, b }); links.appendChild(b); }
        rows.push(h('div', { class: 'ng-row' }, h('span', { class: 'tx-n' }, String(i + 1)), inp, links));
      }
      paint(); preview.replaceChildren(ST.netSVG(read()));
      return { el: wrapField(f, h('div', { class: 'mm-wrap' }, h('div', { class: 'ng-form' }, rows, h('div', { class: 'f-hint2' }, '연결 번호를 누르면 두 노트가 이어집니다 (다시 누르면 해제). 연결이 가장 많은 노트는 ★ 허브가 됩니다.')), preview)), get: read, valid: () => { const v = read(); return v.n.length >= 3 && v.e.length >= 2; } };
    },
    sample(f, r) { return r.pick(f.samples); }
  };

  /* 안내 문장(입력 없음) */
  T.note = { build(f) { return { el: h('div', { class: 'f-note', html: f.html }), get: () => undefined, valid: () => true }; }, sample: () => undefined };
})();
