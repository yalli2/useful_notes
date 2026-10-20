/* 앱: 라우팅, 화면 구성, 실습 폼 + 실시간 결과 */
(function () {
  const ST = window.ST; const { h, store, PROGRAM } = Object.assign({}, ST, { PROGRAM: ST.PROGRAM }); const me = store.me;
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('#app'); const nav = $('#chapnav');
  let cleanups = [];
  const clearAll = () => { cleanups.forEach((f) => { try { f(); } catch (e) {} }); cleanups = []; };

  /* ── 샘플 참가자 (단독 모드) ── */
  const NAMES = ['민준', '서연', '지호', '하은', '도윤', '수아', '예준', '지우', '시우', '채원', '건우', '나은'];
  const T0 = Date.UTC(2026, 9, 1, 3, 0, 0);
  function sampleChapter(ch) {
    const o = {};
    ch.acts.forEach((a) => {
      const m = {};
      for (let i = 0; i < NAMES.length; i++) {
        const r = ST.rng(ch.id + a.id + i); if (r() < 0.16) continue; const d = {};
        a.fields.forEach((f) => { const v = ST.fieldTypes[f.type].sample(f, r, i); if (v !== undefined) d[f.k] = v; });
        const rec = { n: NAMES[i], t: T0 + i * 61000, d, s: 1 };
        if (a.fields.some((f) => f.type === 'steps')) { rec.r = {}; const k = r.int(1, 4); for (let j = 0; j < k; j++) rec.r['x' + j] = r.int(3, 5); }
        m['sample-' + i] = rec;
      }
      o[a.id] = m;
    });
    return o;
  }
  store.sampleProvider = (base) => {
    if (base === '_users') { const u = {}; NAMES.forEach((n, i) => (u['sample-' + i] = { n, t: T0, s: 1 })); return u; }
    if (!base) { const all = { _users: store.sampleProvider('_users') }; ST.CHAPTERS.forEach((c) => (all[c.id] = sampleChapter(c))); return all; }
    const ch = ST.CHAPTERS.find((c) => c.id === base); return ch ? sampleChapter(ch) : null;
  };

  /* ── 진행 상태(내 브라우저) ── */
  const doneKey = () => 'nw.done.' + store.room;
  const getDone = () => { try { return JSON.parse(localStorage.getItem(doneKey())) || {}; } catch (e) { return {}; } };
  const markDone = (id, v = true) => { const d = getDone(); if (v) d[id] = 1; else delete d[id]; try { localStorage.setItem(doneKey(), JSON.stringify(d)); } catch (e) {} renderNav(); };

  /* ── 공통 UI ── */
  function toast(msg, kind) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || ''); clearTimeout(toast.tm); toast.tm = setTimeout(() => (t.className = 'toast'), 3200);
  }
  const rowsOf = (obj) => Object.entries(obj || {}).filter(([, v]) => v && typeof v === 'object' && v.d).map(([uid, v]) => ({ uid, ...v }));

  function renderNav() {
    const done = getDone(); const cur = (location.hash.match(/^#\/c\/(\d+)/) || [])[1];
    nav.replaceChildren(
      h('a', { href: '#/', class: 'nav-item' + (location.hash === '' || location.hash === '#/' ? ' cur' : '') }, h('span', { class: 'nav-no' }, '·'), h('span', { class: 'nav-t' }, '프로그램 소개')),
      ...ST.CHAPTERS.map((c) => {
        const n = c.acts.filter((a) => done[c.id + '/' + a.id]).length;
        return h('a', { href: `#/c/${c.no}`, class: 'nav-item' + (+cur === c.no ? ' cur' : '') + (n === c.acts.length ? ' done' : ''), 'aria-current': +cur === c.no ? 'page' : null },
          h('span', { class: 'nav-no' }, String(c.no)), h('span', { class: 'nav-t' }, c.short), h('span', { class: 'nav-p', title: `실습 ${n}/${c.acts.length}`, 'aria-label': `실습 ${n}/${c.acts.length} 완료` }, c.acts.map((a, i) => h('i', { class: i < n ? 'on' : '' }))));
      }),
      h('a', { href: '#/room', class: 'nav-item room' + (location.hash === '#/room' ? ' cur' : '') }, h('span', { class: 'nav-no' }, ST.icon('users', 16)), h('span', { class: 'nav-t' }, '참가 현황 · 진행자'))
    );
  }

  /* ── 상단 상태 ── */
  const statusEl = $('#status'), roomBtn = $('#roomBtn');
  store.onStatus((s) => {
    const map = { live: ['live', '실시간 연결됨'], connecting: ['wait', '연결 중…'], offline: ['off', '연결 끊김 — 다시 시도 중'], local: ['local', '단독 모드'] };
    const [c, t] = map[s]; statusEl.className = 'status ' + c; statusEl.textContent = '';
    statusEl.append(h('i', {}), t);
  });
  function updateTop() {
    roomBtn.replaceChildren(ST.icon('users', 16), h('span', {}, `${store.room}`), h('b', { id: 'ucount' }, ''), h('span', { class: 'who-me' }, me.name || '이름 정하기'));
  }
  let unUsers = null;
  function watchUsers() {
    if (unUsers) unUsers();
    unUsers = store.watch('_users', (u) => { const n = Object.keys(u || {}).length; const el = $('#ucount'); if (el) el.textContent = n ? `${n}명` : ''; });
  }
  function presence() { if (me.name) store.put('_users/' + me.id, { n: me.name, t: Date.now() }).catch(() => {}); }

  /* ── 참가 다이얼로그 ── */
  const dlg = $('#join');
  function openJoin(after) {
    $('#jn-name').value = me.name || ''; $('#jn-room').value = store.room;
    dlg.dataset.after = after ? '1' : ''; dlg.showModal(); $('#jn-name').focus();
  }
  $('#join-form').addEventListener('submit', (e) => {
    e.preventDefault(); const name = $('#jn-name').value.trim().slice(0, 12); if (!name) { $('#jn-name').focus(); return; }
    const room = $('#jn-room').value.trim() || store.room; const changed = room.toUpperCase() !== store.room; store.setName(name);
    if (changed) { store.setRoom(room); dlg.close(); location.href = location.pathname + '?room=' + encodeURIComponent(store.room) + location.hash; return; }
    dlg.close(); presence(); updateTop(); route();
  });
  $('#join-cancel').addEventListener('click', () => dlg.close());
  roomBtn.addEventListener('click', () => openJoin());
  $('#zoom .zoom-close').addEventListener('click', () => $('#zoom').close());
  $('#zoom').addEventListener('click', (e) => { if (e.target.id === 'zoom') e.target.close(); });
  $('#menuBtn').addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); $('#menuBtn').setAttribute('aria-expanded', open); });
  nav.addEventListener('click', () => document.body.classList.remove('nav-open'));

  /* ── 홈 ── */
  function pageHome() {
    const done = getDone(); const total = ST.CHAPTERS.reduce((a, c) => a + c.acts.length, 0); const n = Object.keys(done).length;
    const doodle = ST.fieldTypes.draw.build({ type: 'draw', label: '' });
    app.replaceChildren(
      h('section', { class: 'hero' },
        h('div', { class: 'hero-copy' },
          h('p', { class: 'kicker' }, 'HR 성인 학습 프로그램 · 노트 메이킹'),
          h('h1', {}, h('span', { class: 'hl' }, PROGRAM.name), h('span', { class: 'en' }, PROGRAM.en)),
          h('p', { class: 'tagline' }, PROGRAM.tag),
          h('p', { class: 'desc' }, PROGRAM.desc),
          h('div', { class: 'hero-cta' },
            h('a', { class: 'btn primary', href: '#/c/1' }, me.name ? '1장부터 시작하기' : '시작하기'),
            h('button', { class: 'btn ghost', type: 'button', onclick: () => openJoin() }, me.name ? `${me.name} · 방 ${store.room}` : '이름과 방 코드 정하기')),
          store.mode === 'local' ? h('p', { class: 'mode-note' }, h('b', {}, '단독 모드'), ' — 지금은 이 브라우저에만 저장되고, 샘플 참가자 12명의 응답이 함께 보입니다. 여러 사람이 실시간으로 공유하려면 ', h('a', { href: '#/room' }, '실시간 공유 켜기'), '를 따라 주세요.') : null),
        h('div', { class: 'hero-pad' }, h('div', { class: 'pad-title' }, '워밍업 — 지금 바로 낙서해 보세요'), doodle.el, h('p', { class: 'pad-note' }, '노트 한 귀퉁이에 작은 그림 하나. 이 낙서는 저장되지 않아요.'))
      ),
      h('section', { class: 'block' },
        h('div', { class: 'block-h' }, h('h2', {}, ST.CHAPTERS.length + '개 챕터'), h('span', { class: 'prog' }, `내 실습 ${n}/${total}`)),
        h('div', { class: 'chap-grid' }, ST.CHAPTERS.map((c) => h('a', { class: 'chap-card', href: `#/c/${c.no}` }, h('div', { class: 'cc-no' }, String(c.no).padStart(2, '0')), h('h3', {}, c.title), h('p', {}, c.lead), h('div', { class: 'cc-refs' }, h('span', {}, c.refs.hb), h('span', {}, c.refs.wb)), h('div', { class: 'cc-acts' }, `실습 ${c.acts.length}개`, c.acts.map((a) => h('i', { class: done[c.id + '/' + a.id] ? 'on' : '' }))))))),
      h('section', { class: 'block' },
        h('h2', {}, '이 프로그램의 진행 방식'),
        h('ol', { class: 'flow3' },
          h('li', {}, h('b', {}, '배우기'), h('span', {}, '교재의 핵심 개념을 도해와 함께 짧게 익힙니다.')),
          h('li', {}, h('b', {}, '실습하기'), h('span', {}, '슬라이더·퀴즈·노트 카드·연결망 그리기·스케치 등으로 바로 해 봅니다.')),
          h('li', {}, h('b', {}, '함께 보기'), h('span', {}, '내 결과를 올리면 모두의 결과가 레이더·히트맵·연결망·카드 전시로 실시간 모입니다.'))),
        h('p', { class: 'note-small' }, '교재: ' + PROGRAM.books + '. 이 사이트의 설명·도해·실습 문항은 교재의 내용을 바탕으로 학습용으로 새로 구성한 자료입니다.')),
      h('section', { class: 'block' }, h('h2', {}, '교재 ↔ 프로그램 지도'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'map-tbl' }, h('thead', {}, h('tr', {}, ['장', '프로그램 챕터', '교재 파트', '쪽수'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', {}, ST.CURRICULUM_MAP.map((r) => h('tr', {}, h('td', {}, String(r.no)), h('td', {}, h('a', { href: '#/c/' + r.no }, r.title)), h('td', {}, r.part), h('td', {}, r.pages)))))))
    );
  }

  /* ── 챕터 ── */
  function learnBlock(b) {
    if (b.t === 'points') return h('section', { class: 'lb' }, h('h3', {}, b.title), h('div', { class: 'points' }, b.items.map(([a, p]) => h('article', {}, h('h4', {}, a), h('p', {}, p)))));
    if (b.t === 'steps') return h('section', { class: 'lb' }, h('h3', {}, b.title), h('dl', { class: 'signals' }, b.items.map(([a, p]) => [h('dt', {}, a), h('dd', {}, p)])));
    if (b.t === 'diagram') return h('figure', { class: 'lb diag', html: ST.diagrams[b.d](), }, null);
    if (b.t === 'callout') return h('aside', { class: 'callout' }, h('b', {}, b.title), h('p', {}, b.text));
    return null;
  }
  function diagFig(b) { const fig = h('figure', { class: 'lb diag' }); fig.innerHTML = ST.diagrams[b.d](); fig.appendChild(h('figcaption', {}, b.cap)); return fig; }

  function timerBlock(sec) {
    let left = sec, tm = null; const out = h('output', { class: 'timer-out', 'aria-live': 'off' }, fmt(left)); const btn = h('button', { type: 'button', class: 'btn sm' }, '시작');
    function fmt(x) { return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; }
    btn.onclick = () => { if (tm) { clearInterval(tm); tm = null; btn.textContent = '이어서'; return; } if (left <= 0) left = sec; btn.textContent = '멈춤'; tm = setInterval(() => { left--; out.textContent = fmt(left); out.classList.toggle('low', left <= 15); if (left <= 0) { clearInterval(tm); tm = null; btn.textContent = '다시'; out.textContent = '시간 종료!'; toast('시간 종료! 마지막 한 줄을 적고 올려 보세요.'); } }, 1000); };
    cleanups.push(() => clearInterval(tm));
    return h('div', { class: 'timer' }, ST.icon('clock', 20), out, btn, h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { clearInterval(tm); tm = null; left = sec; out.textContent = fmt(left); out.classList.remove('low'); btn.textContent = '시작'; } }, '처음으로'));
  }
  function passageBlock(p) {
    const synth = window.speechSynthesis; let shown = false; const txt = h('p', { class: 'passage-text', hidden: true }, p.text);
    const play = h('button', { type: 'button', class: 'btn primary sm', disabled: !synth, title: synth ? '' : '이 브라우저는 음성 낭독을 지원하지 않아요. 진행자가 직접 읽어 주세요.' }, ST.icon('sound', 16), '낭독 듣기');
    const stop = h('button', { type: 'button', class: 'btn ghost sm' }, '멈추기');
    const show = h('button', { type: 'button', class: 'btn ghost sm' }, '글로 확인하기 (복습용)');
    if (synth) { play.onclick = () => { synth.cancel(); const u = new SpeechSynthesisUtterance(p.text); u.lang = 'ko-KR'; u.rate = 0.95; synth.speak(u); }; stop.onclick = () => synth.cancel(); cleanups.push(() => synth.cancel()); }
    show.onclick = () => { shown = !shown; txt.hidden = !shown; show.textContent = shown ? '글 숨기기' : '글로 확인하기 (복습용)'; };
    return h('div', { class: 'passage' }, h('div', { class: 'passage-h' }, h('b', {}, p.title), h('small', {}, p.note)), h('div', { class: 'passage-btns' }, play, stop, show), txt);
  }

  function activityBlock(ch, act, idx) {
    const path = `${ch.id}/${act.id}`; const myPath = `${path}/${me.id}`; let widgets = []; let submitted = false; let showRes = false; let lastRows = []; let formInited = false;
    const formEl = h('div', { class: 'form' }); const msg = h('div', { class: 'form-msg', role: 'status' });
    const submit = h('button', { type: 'button', class: 'btn primary' }, '내 결과 올리기');
    const del = h('button', { type: 'button', class: 'btn ghost sm danger', hidden: true }, '내 응답 지우기');
    const peek = h('button', { type: 'button', class: 'btn ghost sm' }, '제출 전에 결과 먼저 보기');
    const resEl = h('div', { class: 'results' }); const resHead = h('div', { class: 'res-head' });
    function mount(init) {
      widgets = act.fields.map((f) => ({ f, w: ST.fieldTypes[f.type].build(f, init ? init[f.k] : undefined) }));
      formEl.replaceChildren(...widgets.map((x) => x.w.el));
    }
    mount(null);
    function paintBtns() { submit.textContent = submitted ? '수정해서 다시 올리기' : '내 결과 올리기'; del.hidden = !submitted; peek.hidden = submitted || showRes; }
    submit.onclick = async () => {
      if (!me.name) { openJoin(true); return; }
      const bad = widgets.filter((x) => !x.w.valid()); formEl.querySelectorAll('.field').forEach((e) => e.classList.remove('invalid'));
      if (bad.length) { bad.forEach((x) => x.w.el.classList.add('invalid')); msg.textContent = '아직 비어 있는 항목이 있어요: ' + bad.map((x) => x.f.label || x.f.k).join(' · '); msg.className = 'form-msg err'; bad[0].w.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const d = {}; widgets.forEach(({ f, w }) => { const v = w.get(); if (v !== undefined) d[f.k] = v; });
      submit.disabled = true;
      try { await store.put(myPath + '/n', me.name); await store.put(myPath + '/t', Date.now()); await store.put(myPath + '/d', d); presence(); submitted = true; showRes = true; markDone(path); msg.textContent = '올렸어요! 아래에서 모두의 결과를 확인하세요.'; msg.className = 'form-msg ok'; toast('결과를 올렸어요'); renderRes(); }
      catch (e) { msg.textContent = '올리지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.'; msg.className = 'form-msg err'; }
      submit.disabled = false; paintBtns();
    };
    del.onclick = async () => { if (!confirm('내 응답을 지울까요? (다른 사람의 평가도 함께 사라집니다)')) return; await store.put(myPath, null); submitted = false; markDone(path, false); mount(null); msg.textContent = '지웠어요.'; msg.className = 'form-msg'; paintBtns(); renderRes(); };
    peek.onclick = () => { showRes = true; paintBtns(); renderRes(); };
    paintBtns();
    function renderRes() {
      resHead.replaceChildren(); resEl.replaceChildren();
      if (!showRes) return;
      const people = lastRows.length;
      resHead.append(h('h4', { class: 'res-t' }, ST.icon('users', 18), '모두의 결과'), h('span', { class: 'res-n' }, `${people}명 참여`, store.mode === 'live' ? h('em', { class: 'live-dot' }, '실시간') : null));
      act.views.forEach((v) => { const fn = ST.views[v.type]; try { resEl.append(h('div', { class: 'view' }, fn(lastRows, { act, v, chId: ch.id }))); } catch (e) { console.error(e); } });
    }
    let raf = 0; const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderRes); };
    const un = store.watch(ch.id, (data) => {
      lastRows = rowsOf(data[act.id]); const mine = lastRows.find((r) => r.uid === me.id);
      if (!formInited) { formInited = true; if (mine && mine.d) { submitted = true; showRes = true; markDone(path); mount(mine.d); msg.textContent = '이전에 올린 내 응답을 불러왔어요. 고쳐서 다시 올릴 수 있어요.'; } paintBtns(); }
      else if (submitted && !mine) { submitted = false; paintBtns(); }
      schedule();
    });
    cleanups.push(un, () => cancelAnimationFrame(raf));
    return h('section', { class: 'act', id: 'act-' + act.id },
      h('header', { class: 'act-h' }, h('span', { class: 'act-no' }, `실습 ${ch.no}-${idx + 1}`), h('h3', {}, act.title), h('p', {}, act.desc)),
      act.timer ? timerBlock(act.timer) : null, act.passage ? passageBlock(act.passage) : null,
      formEl, h('div', { class: 'form-foot' }, submit, peek, del, msg), resHead, resEl);
  }

  function pageChapter(no, tab) {
    const ch = ST.CHAPTERS.find((c) => c.no === no); if (!ch) { location.hash = '#/'; return; }
    const prev = ST.CHAPTERS[no - 2], next = ST.CHAPTERS[no];
    const learn = h('div', { class: 'tabpane', id: 'pane-learn' }, ch.learn.map((b) => (b.t === 'diagram' ? diagFig(b) : learnBlock(b))), h('div', { class: 'to-do' }, h('a', { class: 'btn primary', href: `#/c/${no}/do` }, '실습하러 가기')));
    const doPane = h('div', { class: 'tabpane', id: 'pane-do' }, ch.acts.map((a, i) => activityBlock(ch, a, i)));
    const isDo = tab === 'do';
    app.replaceChildren(
      h('header', { class: 'ch-head' }, h('p', { class: 'kicker' }, `챕터 ${ch.no} / ${ST.CHAPTERS.length}`), h('h1', {}, ch.title), h('p', { class: 'lead' }, ch.lead), h('div', { class: 'refs' }, h('span', {}, ch.refs.hb), h('span', {}, ch.refs.wb))),
      h('div', { class: 'tabs', role: 'tablist' }, h('a', { role: 'tab', href: `#/c/${no}`, 'aria-selected': !isDo, class: isDo ? '' : 'on' }, '배우기'), h('a', { role: 'tab', href: `#/c/${no}/do`, 'aria-selected': isDo, class: isDo ? 'on' : '' }, `실습하고 함께 보기 (${ch.acts.length})`)),
      isDo ? doPane : learn,
      h('nav', { class: 'pager', 'aria-label': '챕터 이동' }, prev ? h('a', { href: `#/c/${prev.no}` }, '← ' + prev.short) : h('span', {}), next ? h('a', { href: `#/c/${next.no}` }, next.short + ' →') : h('a', { href: '#/room' }, '참가 현황 보기 →')));
    if (!isDo) { /* 배우기 탭에서는 구독 불필요 */ }
  }

  /* ── 참가 현황 / 진행자 ── */
  function pageRoom() {
    const wrap = h('div', {}); const link = location.origin + location.pathname + '?room=' + encodeURIComponent(store.room);
    const body = h('div', { class: 'room-body' });
    const copy = h('button', { class: 'btn sm', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(link); toast('초대 링크를 복사했어요'); } catch (e) { toast('복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.', 'err'); } } }, '초대 링크 복사');
    const sampleToggle = store.mode === 'local' ? h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: store.samples ? true : null, onchange: (e) => store.setSamples(e.target.checked) }), h('span', {}, '샘플 참가자 12명 보이기')) : null;
    app.replaceChildren(
      h('header', { class: 'ch-head' }, h('p', { class: 'kicker' }, '진행자 화면'), h('h1', {}, '참가 현황'), h('p', { class: 'lead' }, `방 코드 ${store.room} · 챕터별로 몇 명이 실습을 올렸는지 실시간으로 확인합니다.`)),
      h('div', { class: 'invite' }, h('code', {}, link), copy, sampleToggle), body,
      h('section', { class: 'block setup' }, h('h2', {}, '실시간 공유 켜기 (한 번만 설정)'),
        h('p', {}, store.mode === 'live' ? '지금 Firebase Realtime Database에 연결되어 있습니다. 같은 방 코드로 접속한 모든 참가자의 결과가 즉시 공유됩니다.' : '지금은 단독 모드입니다. 아래 순서로 Firebase 주소를 넣으면 여러 사람의 화면이 실시간으로 이어집니다.'),
        h('ol', { class: 'setup-steps' }, [
          'firebase.google.com 에서 프로젝트를 만들고 Realtime Database를 “테스트 모드”로 시작합니다.',
          '데이터베이스 주소(예: https://내프로젝트-default-rtdb.asia-southeast1.firebasedatabase.app)를 복사합니다.',
          '저장소의 config.js 파일 firebaseUrl 에 붙여 넣고 저장(커밋)합니다.',
          '규칙(Rules)에서 note-weave 아래만 읽기·쓰기를 허용합니다. 자세한 규칙 예시는 README.md 에 있어요.',
          '수업마다 ?room=HR2026 처럼 방 코드를 다르게 하면 반별로 결과가 분리됩니다.'].map((t) => h('li', {}, t)))));
    const un = store.watch('', (all) => {
      const users = Object.entries(all._users || {}).map(([id, v]) => ({ id, ...v }));
      const maxU = Math.max(1, users.length);
      body.replaceChildren(
        h('section', { class: 'block' }, h('h2', {}, `참가자 ${users.length}명`), h('div', { class: 'chips' }, users.length ? users.sort((a, b) => (b.t || 0) - (a.t || 0)).map((u) => h('span', { class: 'chip' + (u.id === me.id ? ' me' : '') }, u.n || '익명', u.s ? h('em', { class: 'sample-tag' }, '샘플') : null)) : h('span', { class: 'v-empty' }, '아직 입장한 사람이 없어요.'))),
        h('section', { class: 'block' }, h('h2', {}, '챕터별 실습 참여'), h('div', { class: 'tbl-wrap' }, h('table', { class: 'map-tbl prog-tbl' }, h('thead', {}, h('tr', {}, h('th', {}, '챕터'), h('th', {}, '실습'), h('th', {}, '제출 현황'))), h('tbody', {}, ST.CHAPTERS.flatMap((c) => c.acts.map((a, i) => {
          const n = rowsOf((all[c.id] || {})[a.id]).length;
          return h('tr', {}, i === 0 ? h('td', { rowspan: c.acts.length }, h('a', { href: `#/c/${c.no}/do` }, `${c.no}. ${c.short}`)) : null, h('td', {}, a.title), h('td', {}, h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: Math.min(100, (n / maxU) * 100) + '%' } })), h('span', { class: 'bar-n' }, `${n}명`)));
        })))))));
    });
    cleanups.push(un);
  }

  /* ── 라우터 ── */
  function route() {
    clearAll(); document.body.classList.remove('nav-open');
    const hash = location.hash || '#/'; let m;
    if ((m = hash.match(/^#\/c\/(\d+)(?:\/(do))?/))) pageChapter(+m[1], m[2]); else if (hash.startsWith('#/room')) pageRoom(); else pageHome();
    renderNav(); updateTop(); document.title = (m ? ST.CHAPTERS[+m[1] - 1]?.short + ' · ' : '') + PROGRAM.name + ' — ' + PROGRAM.en; window.scrollTo(0, 0); app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  watchUsers(); presence(); route();
  if (!me.name && !sessionStorage.getItem('nw.welcomed')) { try { sessionStorage.setItem('nw.welcomed', '1'); } catch (e) {} setTimeout(() => openJoin(), 500); }
  ST.app = { route, toast };
})();
