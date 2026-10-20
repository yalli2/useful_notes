/* 그림·마인드맵·프로세스 도표 렌더러 (모두 SVG, 벡터로 저장) */
(function () {
  const ST = window.ST; const { s, wrap, PAL } = ST;
  const FONT = "'Gaegu','Nanum Pen Script','Comic Sans MS',cursive";

  /* ── 자유 드로잉 ── */
  ST.DRAW_W = 600; ST.DRAW_H = 380;
  function opNode(op) {
    const st = { stroke: op.c || PAL.ink, 'stroke-width': op.w || 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    if (op.a) st['stroke-opacity'] = op.a;
    switch (op.t) {
      case 'p': {
        const q = op.q || []; let d = '';
        for (let i = 0; i + 1 < q.length; i += 2) d += (i ? 'L' : 'M') + q[i] + ' ' + q[i + 1];
        if (q.length === 2) d += 'l0.1 0';
        return s('path', { ...st, d });
      }
      case 'l': return s('line', { ...st, x1: op.x1, y1: op.y1, x2: op.x2, y2: op.y2 });
      case 'c': return s('ellipse', { ...st, cx: op.cx, cy: op.cy, rx: Math.max(1, op.rx), ry: Math.max(1, op.ry) });
      case 'r': return s('rect', { ...st, x: op.x, y: op.y, width: op.w2, height: op.h2, rx: 2 });
      case 'g': return s('path', { ...st, d: `M${op.x + op.w2 / 2} ${op.y}L${op.x + op.w2} ${op.y + op.h2}L${op.x} ${op.y + op.h2}Z` });
      case 'd': return s('circle', { cx: op.cx, cy: op.cy, r: op.r || 4, fill: op.c || PAL.ink });
      case 't': return s('text', { x: op.x, y: op.y, fill: op.c || PAL.ink, 'font-family': FONT, 'font-size': op.z || 28, 'font-weight': 700 }, op.s);
      default: return s('g');
    }
  }
  ST.opNode = opNode;
  ST.drawingSVG = (val, o = {}) => {
    const svg = s('svg', { viewBox: `0 0 ${ST.DRAW_W} ${ST.DRAW_H}`, class: 'drawing ' + (o.cls || ''), role: 'img', 'aria-label': o.label || '그림' });
    svg.appendChild(s('rect', { width: ST.DRAW_W, height: ST.DRAW_H, fill: '#fff' }));
    ((val && val.ops) || []).forEach((op) => svg.appendChild(opNode(op)));
    return svg;
  };

  /* ── 마인드맵 ── */
  ST.MARKS = { '': null, star: '핵심', question: '질문', warn: '주의', bolt: '아이디어', check: '결정' };
  ST.MARK_COLOR = { star: PAL.amber, question: PAL.blue, warn: PAL.pink, bolt: PAL.violet, check: PAL.mint };
  const trunc = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  ST.mindmapSVG = (val, o = {}) => {
    const W = 600, H = 420, cx = 300, cy = 210;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'drawing mapsvg ' + (o.cls || ''), role: 'img', 'aria-label': '마인드맵' });
    svg.appendChild(s('rect', { width: W, height: H, fill: '#fff' }));
    const b = (val && val.b) || []; const n = Math.max(1, b.length);
    b.forEach((br, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n === 1 ? Math.PI / 2 : 0);
      const bx = cx + Math.cos(ang) * 135, by = cy + Math.sin(ang) * 95;
      const col = ST.SERIES[i % ST.SERIES.length];
      svg.appendChild(s('path', { d: `M${cx} ${cy}Q${(cx + bx) / 2 + 8} ${(cy + by) / 2 - 8} ${bx} ${by}`, stroke: col, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }));
      const leaves = br.l || [];
      leaves.forEach((lf, j) => {
        const sp = (j - (leaves.length - 1) / 2) * 0.42;
        const la = ang + sp; const lx = bx + Math.cos(la) * 78 + Math.cos(ang) * 14, ly = by + Math.sin(la) * 58;
        svg.appendChild(s('line', { x1: bx, y1: by, x2: lx, y2: ly, stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
        const right = Math.cos(la) >= -0.15; const tx = lx + (right ? 14 : -14);
        const mk = lf.m;
        if (mk) {
          const g = s('g', { transform: `translate(${lx - 9},${ly - 9}) scale(.75)`, color: ST.MARK_COLOR[mk] || col });
          g.appendChild(s('path', { d: ST.iconPath(mk), fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
          svg.appendChild(g);
        } else svg.appendChild(s('circle', { cx: lx, cy: ly, r: 3.5, fill: col }));
        svg.appendChild(s('text', { x: tx + (mk ? (right ? 2 : -2) : 0), y: ly + 4, 'text-anchor': right ? 'start' : 'end', 'font-size': 13, fill: PAL.ink, 'font-family': 'inherit' }, trunc(lf.t, 11)));
      });
      svg.appendChild(s('rect', { x: bx - 46, y: by - 14, width: 92, height: 28, rx: 14, fill: col }));
      svg.appendChild(s('text', { x: bx, y: by + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 14, 'font-weight': 700 }, trunc(br.t, 8)));
    });
    svg.appendChild(s('ellipse', { cx, cy, rx: 62, ry: 36, fill: PAL.yellow, stroke: PAL.ink, 'stroke-width': 2.5 }));
    wrap((val && val.c) || '', 7, 2).forEach((ln, i, a) =>
      svg.appendChild(s('text', { x: cx, y: cy + 5 + (i - (a.length - 1) / 2) * 17, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: PAL.ink, 'font-family': FONT }, ln)));
    return svg;
  };

  /* ── 프로세스(단계) 도표 ── */
  ST.flowSVG = (val, o = {}) => {
    const steps = (val && val.s) || []; const per = 3, bw = 170, bh = 108, gx = 30, gy = 34;
    const rows = Math.max(1, Math.ceil(steps.length / per)); const W = 600, H = 56 + rows * (bh + gy);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'drawing flowsvg ' + (o.cls || ''), role: 'img', 'aria-label': '프로세스 도표' });
    svg.appendChild(s('rect', { width: W, height: H, fill: '#fff' }));
    svg.appendChild(s('text', { x: 20, y: 34, 'font-size': 26, 'font-weight': 700, fill: PAL.ink, 'font-family': FONT }, trunc((val && val.title) || '', 26)));
    svg.appendChild(s('rect', { x: 18, y: 40, width: Math.min(560, 14 + Math.min(26, ((val && val.title) || '').length) * 17), height: 7, fill: PAL.yellow, opacity: .85 }));
    const pos = (i) => { const r = Math.floor(i / per), c = i % per; return { x: 20 + c * (bw + gx), y: 62 + r * (bh + gy) }; };
    steps.forEach((st, i) => {
      const { x, y } = pos(i);
      if (i < steps.length - 1) {
        const nx = pos(i + 1);
        if (nx.y === y) svg.appendChild(s('path', { d: `M${x + bw + 3} ${y + bh / 2}L${nx.x - 5} ${y + bh / 2}M${nx.x - 12} ${y + bh / 2 - 6}L${nx.x - 4} ${y + bh / 2}L${nx.x - 12} ${y + bh / 2 + 6}`, stroke: PAL.ink, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        else svg.appendChild(s('path', { d: `M${x + bw / 2} ${y + bh + 3}C${x + bw / 2} ${y + bh + 30} ${nx.x + bw / 2} ${nx.y - 30} ${nx.x + bw / 2} ${nx.y - 4}`, stroke: PAL.ink, 'stroke-width': 2.2, fill: 'none', 'stroke-dasharray': '5 4', 'stroke-linecap': 'round' }));
      }
      const col = st.d === 'dont' ? PAL.pink : st.d === 'do' ? PAL.mint : PAL.blue;
      svg.appendChild(s('rect', { x, y, width: bw, height: bh, rx: 12, fill: '#fff', stroke: col, 'stroke-width': 2.5 }));
      svg.appendChild(s('circle', { cx: x + 22, cy: y + 22, r: 14, fill: col }));
      svg.appendChild(s('text', { x: x + 22, y: y + 27, 'text-anchor': 'middle', fill: '#fff', 'font-size': 14, 'font-weight': 700 }, String(i + 1)));
      const g = s('g', { transform: `translate(${x + bw - 38},${y + 8}) scale(1.2)`, color: col });
      g.appendChild(s('path', { d: ST.iconPath(st.i || 'star'), fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      svg.appendChild(g);
      wrap(st.t, 12, 3).forEach((ln, k) => svg.appendChild(s('text', { x: x + 14, y: y + 58 + k * 18, 'font-size': 14, fill: PAL.ink }, ln)));
      if (st.d) svg.appendChild(s('text', { x: x + bw - 10, y: y + bh - 8, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, fill: col }, st.d === 'do' ? '✔ Do' : '✖ Don’t'));
    });
    return svg;
  };


  /* ── 노트 연결망(네트워크 그래프) ── val = { n: [라벨...], e: [[i,j]...] } */
  ST.netStats = (val) => {
    const n = ((val && val.n) || []).length; const e = ((val && val.e) || []); const deg = new Array(n).fill(0);
    e.forEach(([a, b]) => { if (deg[a] != null && deg[b] != null) { deg[a]++; deg[b]++; } });
    const mx = Math.max(0, ...deg); const hubs = mx >= 2 ? deg.map((d, i) => (d === mx ? i : -1)).filter((i) => i >= 0) : [];
    return { n, m: e.length, deg, hubs, iso: deg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0), density: n > 1 ? e.length / ((n * (n - 1)) / 2) : 0 };
  };
  ST.netSVG = (val, o = {}) => {
    const W = 600, H = 400, cx = 300, cy = 200; const labels = (val && val.n) || []; const N = labels.length; const st = ST.netStats(val);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'drawing netsvg ' + (o.cls || ''), role: 'img', 'aria-label': '노트 연결망' });
    svg.appendChild(s('rect', { width: W, height: H, fill: '#fff' }));
    const pos = labels.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, N); return [cx + Math.cos(a) * 150 * (N === 1 ? 0 : 1), cy + Math.sin(a) * 112 * (N === 1 ? 0 : 1)]; });
    ((val && val.e) || []).forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return; const [x1, y1] = pos[a], [x2, y2] = pos[b]; const mx = (x1 + x2) / 2 + (cy - (y1 + y2) / 2) * 0.12, my = (y1 + y2) / 2 + ((x1 + x2) / 2 - cx) * 0.12;
      const hot = st.hubs.includes(a) || st.hubs.includes(b);
      svg.appendChild(s('path', { d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`, stroke: hot ? PAL.amber : PAL.slate, 'stroke-width': hot ? 3.2 : 2, fill: 'none', 'stroke-linecap': 'round', opacity: 0.9 }));
    });
    labels.forEach((t, i) => {
      const [x, y] = pos[i]; const d = st.deg[i]; const hub = st.hubs.includes(i); const iso = d === 0 && N > 1; const r = 17 + Math.min(d, 5) * 3.2;
      svg.appendChild(s('circle', { cx: x, cy: y, r, fill: hub ? PAL.yellow : iso ? '#fff' : '#EAF0FF', stroke: iso ? PAL.pink : PAL.ink, 'stroke-width': 2.5, 'stroke-dasharray': iso ? '5 4' : null }));
      svg.appendChild(s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: PAL.ink }, String(i + 1)));
      if (hub) { const g = s('g', { transform: `translate(${x + r - 8},${y - r - 6}) scale(.7)`, color: PAL.amber }); g.appendChild(s('path', { d: ST.iconPath('star'), fill: PAL.yellow, stroke: PAL.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' })); svg.appendChild(g); }
      const below = y >= cy - 4; const ty = below ? y + r + 17 : y - r - 8;
      svg.appendChild(s('text', { x, y: ty, 'text-anchor': 'middle', 'font-size': 14, fill: PAL.ink, stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke', 'font-family': 'inherit' }, trunc(t, 10)));
    });
    return svg;
  };

  /* 그림 → PNG 내려받기 */
  ST.downloadSVG = (svg, name) => {
    const clone = svg.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const vb = clone.viewBox.baseVal; const scale = 2;
    clone.setAttribute('width', vb.width * scale); clone.setAttribute('height', vb.height * scale);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = vb.width * scale; c.height = vb.height * scale;
      c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url);
      c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (name || 'note') + '.png'; a.click(); }, 'image/png');
    };
    img.src = url;
  };
})();
