/* 공통 도우미: DOM 생성, 난수, 아이콘 */
(function () {
  const ST = (window.ST = window.ST || {});
  const SVGNS = 'http://www.w3.org/2000/svg';

  function apply(node, attrs) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') node.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  function add(node, kids) {
    for (const c of kids) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) add(node, c);
      else node.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
  }
  ST.h = (tag, attrs, ...kids) => { const n = document.createElement(tag); apply(n, attrs); add(n, kids); return n; };
  ST.s = (tag, attrs, ...kids) => { const n = document.createElementNS(SVGNS, tag); apply(n, attrs); add(n, kids); return n; };
  ST.svgFrom = (str) => { const d = document.createElement('div'); d.innerHTML = str.trim(); return d.firstChild; };

  /* 시드 난수 */
  ST.rng = (seed) => {
    let h = 1779033703 ^ String(seed).length;
    for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.norm = () => (f() + f() + f() + f() - 2) / 2; // -1..1 근사 정규
    return f;
  };

  /* 아이콘 (24×24 선 그림) */
  const P = {
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    clock: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M17.5 14c2.2.4 3.5 2.3 3.5 5',
    target: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    doc: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 16h5',
    chat: 'M4 5h16v11H10l-4 4v-4H4z',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    check: 'M4 12.5l5 5L20 6.5',
    warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
    question: 'M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18v.5',
    heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
    key: 'M3 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0M10.5 12.5L21 4M17 8l2 2M14 11l2 2',
    cup: 'M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9h2a2.5 2.5 0 0 1 0 5h-2M8 3v2M12 3v2',
    book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v13',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
    flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
    gear: 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    pin: 'M12 21s-6-6-6-11a6 6 0 1 1 12 0c0 5-6 11-6 11zM10 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    plane: 'M3 13l18-8-6 15-3-6zM12 14l9-9',
    fork: 'M7 3v7a2 2 0 0 0 2 2v9M11 3v7M9 3v9M17 21V3c-2 1-3 4-3 8h3',
    film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
    pencil: 'M4 20l1-5L16 4l4 4L9 19zM14 6l4 4',
    play: 'M7 5l12 7-12 7z',
    blocked: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M6 18L18 6',
    bolt: 'M13 2L5 13h6l-1 9 8-11h-6z',
    ear: 'M7 10a5 5 0 1 1 10 0c0 3-3 3.5-3 6.5a2.5 2.5 0 0 1-5 0M10 10a2 2 0 1 1 4 0',
    wait: 'M5 5h14M5 19h14M7 5c0 5 5 5 5 7s-5 2-5 7M17 5c0 5-5 5-5 7s5 2 5 7',
    plus: 'M12 5v14M5 12h14',
    trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
    undo: 'M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12',
    download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
    sound: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
    users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c1.8.7 3 2.5 3 6'
  };
  ST.iconNames = Object.keys(P);
  ST.iconPath = (n) => P[n] || P.star;
  ST.icon = (name, size = 20, cls = '') =>
    ST.s('svg', { viewBox: '0 0 24 24', width: size, height: size, class: 'ico ' + cls, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, ST.s('path', { d: P[name] || P.star }));

  /* 글자 수 기준 줄바꿈 */
  ST.wrap = (text, n, maxLines = 3) => {
    const t = String(text || '').trim(); const lines = []; let cur = '';
    for (const word of t.split(/\s+/)) {
      let w = word;
      while (w.length > n) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, n)); w = w.slice(n); }
      if ((cur + ' ' + w).trim().length > n) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { const l = lines.slice(0, maxLines); l[maxLines - 1] = l[maxLines - 1].replace(/.{0,1}$/, '…'); return l; }
    return lines;
  };
  ST.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  ST.PAL = { ink: '#16202E', blue: '#2358D8', pink: '#E2327D', mint: '#1FA37A', amber: '#E8A100', violet: '#7A4DD8', slate: '#5B6B82', yellow: '#FFC928' };
  ST.SERIES = [ST.PAL.blue, ST.PAL.pink, ST.PAL.mint, ST.PAL.amber, ST.PAL.violet, ST.PAL.slate, '#0E8FA8', '#C2552B'];
})();
