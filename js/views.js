/* 결과 보기: 레이더·막대·도넛·산점도·히트맵·갤러리·마인드맵·프로세스·보드·카드 */
(function () {
  const ST = window.ST; const { h, s, PAL } = ST; const V = (ST.views = {});
  const nameOf = (r) => h('span', { class: 'who' + (r.uid === ST.store.me.id ? ' me' : '') }, r.n || '익명', r.s ? h('em', { class: 'sample-tag' }, '샘플') : null, r.uid === ST.store.me.id ? h('em', { class: 'me-tag' }, '나') : null);
  const fieldOf = (act, k) => act.fields.find((f) => f.k === k);
  const vals = (rows, k) => rows.filter((r) => r.d && r.d[k] !== undefined && r.d[k] !== null).map((r) => ({ r, v: r.d[k] }));
  const optsOf = (f) => (f.options || []).map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
  const mine = (rows) => rows.find((r) => r.uid === ST.store.me.id);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const title = (t) => (t ? h('h4', { class: 'v-title' }, t) : null);
  const empty = (msg) => h('div', { class: 'v-empty' }, msg || '아직 응답이 없어요. 첫 번째로 남겨 보세요.');

  /* ── 레이더 ── */
  ST.radarSVG = (items, series, o = {}) => {
    const W = o.w || (o.small ? 200 : 600), H = o.h || 380, cx = W / 2, cy = H / 2 + 4, R = o.R || 118, n = items.length, max = o.max || 10;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart radar', role: 'img', 'aria-label': o.label || '레이더 차트' });
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * (v / max), cy + Math.sin(a) * R * (v / max)]; };
    [0.25, 0.5, 0.75, 1].forEach((k) => svg.appendChild(s('polygon', { points: items.map((_, i) => pt(i, max * k).join(',')).join(' '), fill: k === 1 ? '#fff' : 'none', stroke: '#D4D7CE', 'stroke-width': 1 })));
    items.forEach((it, i) => {
      const [x, y] = pt(i, max); svg.appendChild(s('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: '#D4D7CE' }));
      if (!o.small) { const [lx, ly] = pt(i, max * 1.2); const anc = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'; svg.appendChild(s('text', { x: lx, y: ly + 4, 'text-anchor': anc, 'font-size': 12.5, fill: PAL.ink }, it.l)); }
    });
    series.forEach((se) => {
      const pts = items.map((it, i) => pt(i, Math.max(0, se.vals[it.k] ?? 0)));
      svg.appendChild(s('polygon', { points: pts.map((p) => p.join(',')).join(' '), fill: se.fill || 'none', 'fill-opacity': se.fo ?? 0.18, stroke: se.color, 'stroke-width': se.w || 2.5, 'stroke-linejoin': 'round', 'stroke-dasharray': se.dash || null }));
      if (!o.small) pts.forEach((p) => svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: 3.5, fill: se.color })));
    });
    return svg;
  };
  V.radar = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty();
    const mean = {}; f.items.forEach((it) => (mean[it.k] = avg(data.map((d) => d.v[it.k] ?? 0))));
    const mr = mine(rows); const series = [{ vals: mean, color: PAL.blue, fill: PAL.blue, fo: 0.16 }];
    if (mr && mr.d[f.k]) series.push({ vals: mr.d[f.k], color: PAL.pink, dash: '6 4', w: 2.6 });
    return h('figure', { class: 'v-fig' }, title(c.v.title), ST.radarSVG(f.items, series, { max: (f.max ?? 10), label: c.v.title || '레이더' }),
      h('figcaption', { class: 'legend' }, h('span', {}, h('i', { style: { background: PAL.blue } }), `전체 평균 (${data.length}명)`), mr ? h('span', {}, h('i', { class: 'dash', style: { borderColor: PAL.pink } }), '나') : null));
  };
  V.avgbars = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const max = f.max ?? 10; const mr = mine(rows);
    return h('div', { class: 'v-fig' }, title(c.v.title), f.items.map((it) => {
      const a = avg(data.map((d) => d.v[it.k] ?? 0)); const m = mr && mr.d[f.k] ? mr.d[f.k][it.k] : null;
      return h('div', { class: 'avg-row' }, h('span', { class: 'avg-l' }, it.l), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: (a / max) * 100 + '%' } }), m != null ? h('div', { class: 'tick', style: { left: (m / max) * 100 + '%' }, title: '나: ' + m }) : null), h('span', { class: 'avg-n' }, a.toFixed(1)));
    }), mr ? h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'tickdot' }), '분홍 표식 = 내 점수')) : null);
  };

  /* ── 막대 / 도넛 ── */
  function counts(f, rows) {
    const o = optsOf(f); const m = {}; o.forEach((x) => (m[x.v] = 0)); let n = 0;
    vals(rows, f.k).forEach(({ v }) => { n++; (Array.isArray(v) ? v : [v]).forEach((x) => { m[x] = (m[x] || 0) + 1; }); });
    return { o, m, n };
  }
  V.bar = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const { o, m, n } = counts(f, rows); if (!n) return empty(); const mr = mine(rows); const my = mr ? [].concat(mr.d[f.k] || []) : [];
    const max = Math.max(1, ...Object.values(m)); const order = c.v.sort === false ? o : o.slice().sort((a, b) => m[b.v] - m[a.v]);
    return h('div', { class: 'v-fig' }, title(c.v.title), order.map((x) => h('div', { class: 'bar-row' + (my.includes(x.v) ? ' mine' : '') }, h('span', { class: 'bar-l' }, x.l), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: (m[x.v] / max) * 100 + '%' } })), h('span', { class: 'bar-n' }, String(m[x.v])))), h('div', { class: 'legend' }, `${n}명 응답` + (my.length ? ' · 형광 표시는 내가 고른 항목' : '')));
  };
  V.donut = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); let parts = [];
    if (f.type === 'sliders') { const data = vals(rows, f.k); if (!data.length) return empty(); const tot = f.items.map((it) => avg(data.map((d) => d.v[it.k] ?? 0))); const sum = tot.reduce((a, b) => a + b, 0) || 1; parts = f.items.map((it, i) => ({ l: it.l, v: tot[i], pct: tot[i] / sum })); }
    else if (f.type === 'tasks') { const m = { todo: 0, doing: 0, done: 0, stuck: 0 }; vals(rows, f.k).forEach(({ v }) => v.forEach((t) => (m[t.s] = (m[t.s] || 0) + 1))); const sum = Object.values(m).reduce((a, b) => a + b, 0); if (!sum) return empty(); parts = Object.keys(m).map((k) => ({ l: ST.STATUS[k][0], v: m[k], pct: m[k] / sum, col: ST.STATUS[k][2] })); }
    else { const { o, m, n } = counts(f, rows); if (!n) return empty(); const sum = Object.values(m).reduce((a, b) => a + b, 0); parts = o.map((x) => ({ l: x.l, v: m[x.v], pct: m[x.v] / sum })).filter((p) => p.v > 0); }
    const R = 62, C = 2 * Math.PI * R; let off = 0; const svg = s('svg', { viewBox: '0 0 180 180', class: 'chart donut', role: 'img', 'aria-label': c.v.title || '도넛 차트' });
    svg.appendChild(s('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: '#EEF0E8', 'stroke-width': 26 }));
    parts.forEach((p, i) => { p.col = p.col || ST.SERIES[i % ST.SERIES.length]; svg.appendChild(s('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: p.col, 'stroke-width': 26, 'stroke-dasharray': `${Math.max(0, p.pct * C - 1.5)} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 90 90)' })); off += p.pct * C; });
    return h('figure', { class: 'v-fig donut-fig' }, title(c.v.title), h('div', { class: 'donut-wrap' }, svg, h('ul', { class: 'dl' }, parts.map((p) => h('li', {}, h('i', { style: { background: p.col } }), h('span', {}, p.l), h('b', {}, Math.round(p.pct * 100) + '%'))))));
  };

  /* ── 산점도 ── */
  V.scatter = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty();
    const W = 460, H = 380, L = 44, B = 34, T = 14, Rr = 14; const X = (x) => L + (x / 100) * (W - L - Rr), Y = (y) => T + (1 - y / 100) * (H - T - B);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart scatter', role: 'img', 'aria-label': c.v.title || '산점도' });
    svg.appendChild(s('rect', { x: L, y: T, width: W - L - Rr, height: H - T - B, fill: '#fff', stroke: '#D4D7CE' }));
    svg.appendChild(s('line', { x1: X(50), y1: T, x2: X(50), y2: H - B, stroke: '#D4D7CE', 'stroke-dasharray': '4 4' })); svg.appendChild(s('line', { x1: L, y1: Y(50), x2: W - Rr, y2: Y(50), stroke: '#D4D7CE', 'stroke-dasharray': '4 4' }));
    svg.appendChild(s('text', { x: (L + W - Rr) / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12.5, fill: PAL.ink }, f.xLabel + ' →'));
    svg.appendChild(s('text', { x: 14, y: (T + H - B) / 2, 'text-anchor': 'middle', 'font-size': 12.5, fill: PAL.ink, transform: `rotate(-90 14 ${(T + H - B) / 2})` }, f.yLabel + ' →'));
    (f.q || []).forEach((q, i) => { const px = i % 2 === 0 ? X(3) : X(97), py = i < 2 ? Y(95) : Y(5); svg.appendChild(s('text', { x: px, y: py + (i < 2 ? 8 : -2), 'text-anchor': i % 2 === 0 ? 'start' : 'end', 'font-size': 11.5, fill: '#8A93A3' }, q)); });
    data.forEach(({ r, v }) => { const isMe = r.uid === ST.store.me.id; const g = s('g', {}, s('title', {}, (r.n || '익명') + `: ${v.x}, ${v.y}`), s('circle', { cx: X(v.x), cy: Y(v.y), r: isMe ? 8 : 6, fill: isMe ? PAL.pink : PAL.blue, 'fill-opacity': isMe ? 1 : 0.55, stroke: isMe ? PAL.ink : '#fff', 'stroke-width': isMe ? 2 : 1 })); svg.appendChild(g); });
    const mx = avg(data.map((d) => d.v.x)), my = avg(data.map((d) => d.v.y)); const g = s('g', { stroke: PAL.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, s('path', { d: `M${X(mx) - 8} ${Y(my) - 8}l16 16M${X(mx) - 8} ${Y(my) + 8}l16 -16` })); svg.appendChild(g);
    return h('figure', { class: 'v-fig' }, title(c.v.title), svg, h('figcaption', { class: 'legend' }, h('span', {}, h('i', { style: { background: PAL.blue } }), `참가자 ${data.length}명`), h('span', {}, h('i', { style: { background: PAL.pink } }), '나'), h('span', {}, '✕ 전체 평균')));
  };

  /* ── 포스트잇 / 단어구름 ── */
  const NOTE_COL = ['#FFF3A8', '#FFD9E6', '#CDEFE0', '#D6E4FF'];
  V.notes = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const list = [];
    data.forEach(({ r, v }) => { (Array.isArray(v) ? v : [v]).filter(Boolean).forEach((t) => list.push({ r, t })); });
    const lim = c.v.limit || 60; const more = list.length - lim;
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'notes' }, list.slice(0, lim).map((x, i) => h('div', { class: 'postit' + (x.r.uid === ST.store.me.id ? ' me' : ''), style: { background: NOTE_COL[i % 4], '--rot': ((i * 37) % 5 - 2) * 0.6 + 'deg' } }, h('p', {}, x.t), h('small', {}, nameOf(x.r))))), more > 0 ? h('div', { class: 'legend' }, `외 ${more}개 더 있어요`) : null);
  };
  V.cloud = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const m = new Map();
    data.forEach(({ v }) => { (Array.isArray(v) ? v : [v]).forEach((t) => { String(t).split(/[\s,./·]+/).map((w) => w.trim()).filter((w) => w.length >= 2).forEach((w) => m.set(w, (m.get(w) || 0) + 1)); }); });
    const list = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 36); if (!list.length) return empty(); const mx = list[0][1];
    const shuffled = list.slice().sort((a, b) => ((a[0].charCodeAt(0) * 7) % 11) - ((b[0].charCodeAt(0) * 7) % 11));
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'cloud' }, shuffled.map(([w, n], i) => h('span', { style: { fontSize: 15 + (n / mx) * 26 + 'px', color: ST.SERIES[i % ST.SERIES.length] }, title: n + '회' }, w))));
  };

  /* ── 히트맵 ── */
  V.heat = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const o = optsOf(f); const mr = mine(rows); const my = mr ? mr.d[f.k] || {} : {};
    const cnt = {}; let mx = 1; f.rows.forEach((r) => { cnt[r.k] = {}; o.forEach((x) => (cnt[r.k][x.v] = 0)); data.forEach(({ v }) => { if (v[r.k]) cnt[r.k][v[r.k]]++; }); o.forEach((x) => (mx = Math.max(mx, cnt[r.k][x.v]))); });
    const tbl = h('table', { class: 'heat' }, h('thead', {}, h('tr', {}, h('th', {}, ''), o.map((x) => h('th', { scope: 'col' }, x.l)))), h('tbody', {}, f.rows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.l), o.map((x) => { const n = cnt[r.k][x.v]; return h('td', { class: my[r.k] === x.v ? 'mine' : '', style: { background: n ? `rgba(35,88,216,${0.1 + 0.75 * (n / mx)})` : 'transparent', color: n / mx > 0.55 ? '#fff' : PAL.ink }, title: `${r.l} · ${x.l}: ${n}명` }, n || ''); })))));
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'heat-scroll' }, tbl), h('div', { class: 'legend' }, '진할수록 많이 고른 조합 · 테두리 = 내 선택'));
  };

  /* ── 갤러리(그림) ── */
  ST.zoom = (node, cap, dl) => {
    const dlg = document.getElementById('zoom'); const box = dlg.querySelector('.zoom-body'); box.replaceChildren(node.cloneNode(true));
    dlg.querySelector('.zoom-cap').textContent = cap || ''; const b = dlg.querySelector('.zoom-dl'); b.onclick = () => ST.downloadSVG(box.firstChild, dl || 'sketch'); dlg.showModal();
  };
  V.gallery = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k).filter((d) => d.v && d.v.ops && d.v.ops.length); if (!data.length) return empty();
    const words = f.words || []; const caps = c.v.show || []; const wrap = h('div', { class: 'v-fig' }); const grid = h('div', { class: 'gallery' });
    ST.uiState = ST.uiState || {}; const key = `${c.chId}/${c.act.id}/${f.k}`; let sel = ST.uiState[key] || null;
    const chips = words.length ? h('div', { class: 'pills small' }, [h('button', { type: 'button', class: 'pill' + (sel ? '' : ' on'), onclick: (e) => pick(null, e) }, '전체'), ...words.map((w) => h('button', { type: 'button', class: 'pill' + (sel === w ? ' on' : ''), onclick: (e) => pick(w, e) }, w + ' ' + data.filter((d) => d.v.word === w).length))]) : null;
    function pick(w, e) { sel = w; ST.uiState[key] = w; chips.querySelectorAll('.pill').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); paint(); }
    function paint() {
      grid.replaceChildren(...data.filter((d) => !sel || d.v.word === sel).sort((a, b) => (b.r.uid === ST.store.me.id) - (a.r.uid === ST.store.me.id) || (b.r.t || 0) - (a.r.t || 0)).map(({ r, v }) => {
        const svg = ST.drawingSVG(v, { label: `${r.n}의 그림` });
        return h('figure', { class: 'g-card' + (r.uid === ST.store.me.id ? ' me' : ''), tabindex: 0, role: 'button', 'aria-label': `${r.n}의 그림 크게 보기`, onclick: () => ST.zoom(svg, `${r.n}${v.word ? ' · ' + v.word : ''}`, 'note-' + r.n), onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } }, svg,
          h('figcaption', {}, nameOf(r), v.word ? h('span', { class: 'g-word' }, v.word) : null, caps.map((k) => (r.d[k] ? h('div', { class: 'g-extra' }, r.d[k]) : null))));
      }));
    }
    paint(); wrap.append(title(c.v.title), chips, grid, h('div', { class: 'legend' }, `${data.length}점 · 그림을 누르면 크게 볼 수 있어요`)); return wrap;
  };

  /* ── 마인드맵 ── */
  V.maps = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k).filter((d) => d.v && d.v.b && d.v.b.length); if (!data.length) return empty();
    const tally = {}; Object.keys(ST.MARKS).filter(Boolean).forEach((k) => (tally[k] = 0)); data.forEach(({ v }) => v.b.forEach((b) => b.l.forEach((l) => { if (l.m && tally[l.m] != null) tally[l.m]++; })));
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'marks-row' }, Object.keys(tally).map((k) => h('span', { class: 'mark-chip', style: { color: ST.MARK_COLOR[k] } }, ST.icon(k, 16), h('b', {}, ST.MARKS[k]), h('em', {}, String(tally[k]))))),
      h('div', { class: 'gallery big' }, data.sort((a, b) => (b.r.uid === ST.store.me.id) - (a.r.uid === ST.store.me.id)).map(({ r, v }) => { const svg = ST.mindmapSVG(v); return h('figure', { class: 'g-card' + (r.uid === ST.store.me.id ? ' me' : ''), tabindex: 0, role: 'button', onclick: () => ST.zoom(svg, `${r.n} · ${v.c}`, 'map-' + r.n), onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } }, svg, h('figcaption', {}, nameOf(r))); })));
  };

  /* ── 프로세스 도표 + 동료 평가 ── */
  V.flows = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k).filter((d) => d.v && d.v.s && d.v.s.length); if (!data.length) return empty(); const me = ST.store.me.id;
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'gallery big' }, data.sort((a, b) => (b.r.uid === me) - (a.r.uid === me)).map(({ r, v }) => {
      const rt = r.r || {}; const vs = Object.values(rt); const a = avg(vs); const myR = rt[me] || 0; const svg = ST.flowSVG(v);
      const stars = h('div', { class: 'stars', role: 'radiogroup', 'aria-label': `${r.n}의 도표 평가` }, [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'star' + (n <= myR ? ' on' : ''), disabled: r.uid === me || r.s, title: n + '점', 'aria-label': n + '점', onclick: (e) => { e.stopPropagation(); ST.store.put(`${c.chId}/${c.act.id}/${r.uid}/r/${me}`, n); } }, ST.icon('star', 20))));
      return h('figure', { class: 'g-card flow' + (r.uid === me ? ' me' : ''), }, h('div', { onclick: () => ST.zoom(svg, `${r.n} · ${v.title}`, 'process-' + r.n), tabindex: 0, role: 'button', 'aria-label': `${r.n}의 도표 크게 보기`, onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } }, svg),
        h('figcaption', {}, nameOf(r), h('div', { class: 'rate' }, r.uid === me ? h('span', { class: 'f-hint2' }, '동료가 평가해 줍니다') : r.s ? h('span', { class: 'f-hint2' }, '샘플은 평가할 수 없어요') : [h('span', { class: 'f-hint2' }, '따라 해 보니 어땠나요?'), stars], h('span', { class: 'rate-avg' }, vs.length ? `★ ${a.toFixed(1)} (${vs.length})` : '평가 전'))));
    })));
  };

  /* ── 할 일 보드 ── */
  V.board = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const cols = { todo: [], doing: [], done: [], stuck: [] };
    data.forEach(({ r, v }) => v.forEach((t) => cols[t.s] && cols[t.s].push({ r, t })));
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'board' }, Object.keys(cols).map((k) => { const [l, ic, col] = ST.STATUS[k]; const list = cols[k].sort((a, b) => b.t.p - a.t.p); return h('section', { class: 'col', style: { '--cc': col } }, h('header', {}, ST.icon(ic, 16), h('b', {}, l), h('em', {}, String(list.length))), h('ul', {}, list.slice(0, 14).map((x) => h('li', { class: x.r.uid === ST.store.me.id ? 'me' : '' }, x.t.p ? h('span', { class: 'pri', title: '최우선' }, ST.icon('star', 13)) : null, h('span', { class: 't' }, x.t.t), h('small', {}, x.r.n || '익명'))), list.length > 14 ? h('li', { class: 'more' }, `+${list.length - 14}`) : null)); })));
  };


  /* ── 노트 연결망 갤러리 ── */
  V.nets = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k).filter((d) => d.v && d.v.n && d.v.n.length); if (!data.length) return empty();
    const me = ST.store.me.id; const stats = data.map(({ r, v }) => ({ r, v, st: ST.netStats(v) }));
    const aN = avg(stats.map((x) => x.st.n)), aM = avg(stats.map((x) => x.st.m)), aD = avg(stats.map((x) => x.st.density));
    const hubCount = new Map(); stats.forEach(({ v, st }) => st.hubs.forEach((i) => { const t = v.n[i]; hubCount.set(t, (hubCount.get(t) || 0) + 1); }));
    const hubs = [...hubCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const chip = (k, vv) => h('span', { class: 'mark-chip', style: { color: PAL.blue } }, h('b', {}, k), h('em', {}, vv));
    return h('div', { class: 'v-fig' }, title(c.v.title),
      h('div', { class: 'marks-row' }, chip('평균 노트 수', aN.toFixed(1)), chip('평균 연결 수', aM.toFixed(1)), chip('연결 밀도', Math.round(aD * 100) + '%'), chip('고립 노트', String(stats.reduce((a, x) => a + x.st.iso.length, 0)))),
      hubs.length ? h('div', { class: 'hub-row' }, h('span', { class: 'hub-l' }, ST.icon('star', 16), '자주 허브가 된 아이디어'), hubs.map(([t, n]) => h('span', { class: 'hub-chip' }, t, h('em', {}, n + '회')))) : null,
      h('div', { class: 'gallery big' }, stats.sort((a, b) => (b.r.uid === me) - (a.r.uid === me)).map(({ r, v, st }) => {
        const svg = ST.netSVG(v);
        return h('figure', { class: 'g-card' + (r.uid === me ? ' me' : ''), tabindex: 0, role: 'button', 'aria-label': `${r.n}의 연결망 크게 보기`, onclick: () => ST.zoom(svg, `${r.n} · 노트 ${st.n}장 · 연결 ${st.m}개`, 'network-' + r.n), onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } }, svg,
          h('figcaption', {}, nameOf(r), h('span', { class: 'g-word' }, `연결 ${st.m}`), st.hubs.length ? h('div', { class: 'g-extra' }, '★ 허브: ' + st.hubs.map((i) => v.n[i]).join(', ')) : h('div', { class: 'g-extra' }, '아직 뚜렷한 허브가 없어요'), st.iso.length ? h('div', { class: 'g-extra iso' }, '⚠ 고립된 노트: ' + st.iso.map((i) => v.n[i]).join(', ')) : null));
      })));
  };

  /* ── 퀴즈(정답이 있는 matrix) ── */
  V.quiz = (rows, c) => {
    const f = fieldOf(c.act, c.v.field); const data = vals(rows, f.k); if (!data.length) return empty(); const mr = mine(rows); const my = mr ? mr.d[f.k] || {} : null; const o = optsOf(f); const lab = (v) => (o.find((x) => x.v === v) || {}).l || v;
    const score = (v) => f.rows.filter((r) => v[r.k] === r.ans).length; const sc = data.map((d) => score(d.v)); const mean = avg(sc);
    return h('div', { class: 'v-fig' }, title(c.v.title),
      h('div', { class: 'marks-row' }, h('span', { class: 'mark-chip', style: { color: PAL.blue } }, h('b', {}, '전체 평균'), h('em', {}, `${mean.toFixed(1)} / ${f.rows.length}`)), my ? h('span', { class: 'mark-chip', style: { color: PAL.pink } }, h('b', {}, '내 점수'), h('em', {}, `${score(my)} / ${f.rows.length}`)) : null, h('span', { class: 'mark-chip', style: { color: PAL.mint } }, h('b', {}, '응답'), h('em', {}, data.length + '명'))),
      f.rows.map((r) => { const ok = data.filter((d) => d.v[r.k] === r.ans).length; const pct = Math.round((ok / data.length) * 100); const right = my && my[r.k] === r.ans;
        return h('div', { class: 'quiz-q' }, h('div', { class: 'quiz-h' }, my ? h('span', { class: 'quiz-mark ' + (right ? 'ok' : 'no') }, right ? '✔' : '✖') : null, h('span', { class: 'quiz-t' }, r.l), h('span', { class: 'quiz-ans' }, '정답: ' + lab(r.ans))),
          h('div', { class: 'bar-row' }, h('span', { class: 'bar-l' }, '정답률'), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: pct + '%' } })), h('span', { class: 'bar-n' }, pct + '%')), r.why ? h('p', { class: 'quiz-why' }, r.why) : null); }));
  };

  /* ── 카드(응답자별) ── */
  const R = {};
  R.header = (r, c) => { const d = r.d; return h('div', { class: 'hdr hdr-' + (d.style || 'banner') }, h('div', { class: 'hdr-t' }, d.title), h('div', { class: 'hdr-s' }, d.speaker), d.tag ? h('div', { class: 'hdr-g' }, d.tag) : null); };
  R.hier = (r) => { const d = r.d; return h('div', { class: 'hier' }, h('div', { class: 'hier-t' }, d.title), h('div', { class: 'hier-subs' }, (d.subs || []).map((x) => h('div', { class: 'hier-sub' }, x))), h('div', { class: 'hier-keys' }, (d.keys || []).map((x) => h('span', {}, x))), d.note ? h('div', { class: 'hier-note' }, d.note) : null); };
  R.plan = (r, c) => h('ol', { class: 'plan' }, (r.d.plan || []).map((t, i) => (t ? h('li', {}, h('b', {}, `${i + 1}년차`), h('span', {}, t)) : null)), r.d.area ? h('li', { class: 'plan-area' }, h('b', {}, '중심 영역'), h('span', {}, r.d.area)) : null);
  R.exp = (r, c) => { const f = fieldOf(c.act, 'score'); const d = r.d; return h('div', { class: 'exp' }, h('div', { class: 'exp-h' }, h('span', { class: 'exp-type' }, d.kind), h('b', {}, d.title)), ST.radarSVG(f.items, [{ vals: d.score || {}, color: PAL.pink, fill: PAL.pink, fo: 0.2 }], { small: true, w: 200, h: 170, R: 62 }), d.quote ? h('blockquote', {}, d.quote) : null, d.apply ? h('div', { class: 'exp-a' }, h('b', {}, '조직에 적용'), d.apply) : null); };
  R.ideas = (r) => h('ul', { class: 'ideas' }, (r.d.ideas || []).map((x) => h('li', {}, x)));
  R.commit = (r) => h('div', { class: 'commit' }, h('ul', {}, (r.d.habits || []).map((x) => h('li', {}, ST.icon('check', 16), x))), r.d.vow ? h('p', { class: 'vow' }, '“' + r.d.vow + '”') : null, r.d.conf && r.d.conf.v != null ? h('div', { class: 'conf' }, `실천 자신감 ${r.d.conf.v}/10`) : null);

  ST.NOTE_KINDS = { fleeting: ['임시 노트', '#E8A100'], literature: ['문헌 노트', '#2358D8'], permanent: ['영구 노트', '#1FA37A'], biblio: ['서지 노트', '#7A4DD8'], structure: ['구조 노트', '#E2327D'], project: ['프로젝트 노트', '#5B6B82'] };
  R.note = (r) => { const d = r.d; const k = ST.NOTE_KINDS[d.kind] || ['노트', '#5B6B82']; return h('div', { class: 'ncard', style: { '--nc': k[1] } },
    h('div', { class: 'ncard-top' }, h('span', { class: 'ncard-kind' }, k[0]), h('span', { class: 'ncard-id' }, '#' + String(r.t || 0).slice(-4))),
    h('div', { class: 'ncard-title' }, d.title), d.body ? h('p', { class: 'ncard-body' }, d.body) : null,
    d.src ? h('div', { class: 'ncard-row' }, h('b', {}, '출처'), h('span', {}, d.src)) : null, d.link ? h('div', { class: 'ncard-row' }, h('b', {}, '연결'), h('span', { class: 'ncard-link' }, '[[' + d.link + ']]')) : null,
    d.tags && d.tags.length ? h('div', { class: 'ncard-tags' }, d.tags.map((t) => h('span', {}, '#' + String(t).replace(/^#/, '')))) : null); };
  R.okr = (r) => { const d = r.d; return h('div', { class: 'okr' }, h('div', { class: 'okr-o' }, ST.icon('flag', 18), h('b', {}, d.obj)), h('ol', { class: 'okr-k' }, (d.kr || []).map((x) => h('li', {}, x))), d.why ? h('div', { class: 'okr-w' }, '왜? ' + d.why) : null); };

  V.cards = (rows, c) => {
    const data = rows.filter((r) => r.d && Object.keys(r.d).length); if (!data.length) return empty(); const fn = R[c.v.as];
    return h('div', { class: 'v-fig' }, title(c.v.title), h('div', { class: 'cards ' + c.v.as }, data.sort((a, b) => (b.uid === ST.store.me.id) - (a.uid === ST.store.me.id) || (b.t || 0) - (a.t || 0)).slice(0, c.v.limit || 24).map((r) => h('article', { class: 'card' + (r.uid === ST.store.me.id ? ' me' : '') }, fn(r, c), h('footer', {}, nameOf(r))))));
  };

  /* 평균 레이더 by 종류 (경험 카드) */
  V.kindbar = (rows, c) => { const f = fieldOf(c.act, c.v.field); return V.bar(rows, { ...c, v: { ...c.v, field: f.k } }); };
})();
