/* 저장소 어댑터: Firebase Realtime Database(REST + SSE) 또는 단독(local) 모드 */
(function () {
  const cfg = window.ST_CONFIG || {};
  const ST = (window.ST = window.ST || {});
  const ROOT = cfg.root || 'note-weave';
  const BASE = (cfg.firebaseUrl || '').replace(/\/+$/, '');
  const LIVE = !!BASE;

  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const rid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

  const me = lsGet('nw.user', null) || { id: rid(), name: '' };
  if (!me.id) me.id = rid();
  lsSet('nw.user', me);

  const qs = new URLSearchParams(location.search);
  const cleanRoom = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9가-힣_-]/g, '').slice(0, 24);
  let room = cleanRoom(qs.get('room')) || cleanRoom(lsGet('nw.room', '')) || cleanRoom(cfg.defaultRoom) || 'CLASS';

  const statusCbs = [];
  let status = LIVE ? 'connecting' : 'local';
  const setStatus = (s) => { if (s !== status) { status = s; statusCbs.forEach((f) => f(s)); } };

  function setAt(obj, path, data) {
    const seg = String(path).split('/').filter(Boolean);
    if (!seg.length) return;
    let o = obj;
    for (let i = 0; i < seg.length - 1; i++) {
      if (o[seg[i]] == null || typeof o[seg[i]] !== 'object') { if (data == null) return; o[seg[i]] = {}; }
      o = o[seg[i]];
    }
    const k = seg[seg.length - 1];
    if (data == null) delete o[k]; else o[k] = data;
  }
  function getAt(obj, path) {
    const seg = String(path).split('/').filter(Boolean);
    let o = obj;
    for (const s of seg) { if (o == null || typeof o !== 'object') return undefined; o = o[s]; }
    return o;
  }
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

  const watchers = new Set();
  const store = {
    mode: LIVE ? 'live' : 'local',
    me, get room() { return room; },
    samples: LIVE ? false : lsGet('nw.samples', true),
    sampleProvider: null,
    onStatus(cb) { statusCbs.push(cb); cb(status); },
    setName(n) { me.name = n; lsSet('nw.user', me); },
    setRoom(r) { room = cleanRoom(r) || 'CLASS'; lsSet('nw.room', room); },
    setSamples(v) { store.samples = !!v; lsSet('nw.samples', !!v); watchers.forEach((w) => w.emit()); },

    /* base 아래의 데이터를 구독. cb(데이터객체) 가 변경될 때마다 호출. 해제 함수를 돌려줌 */
    watch(base, cb) {
      const w = { base, cb, cache: {}, es: null, closed: false, timer: null };
      const view = () => {
        let d = clone(w.cache) || {};
        if (!LIVE && store.samples && store.sampleProvider) {
          const s = store.sampleProvider(base);
          if (s) d = mergeDeep(s, d);
        }
        return d;
      };
      w.emit = () => { if (!w.closed) cb(view()); };
      if (LIVE) {
        const open = () => {
          if (w.closed) return;
          const url = `${BASE}/${encodeURIComponent(ROOT)}/${encodeURIComponent(room)}${base ? '/' + base : ''}.json`;
          const es = new EventSource(url); w.es = es;
          es.addEventListener('put', (e) => {
            const m = JSON.parse(e.data);
            if (m.path === '/') w.cache = m.data || {}; else setAt(w.cache, m.path, m.data);
            setStatus('live'); w.emit();
          });
          es.addEventListener('patch', (e) => {
            const m = JSON.parse(e.data);
            for (const k in m.data) setAt(w.cache, (m.path === '/' ? '' : m.path) + '/' + k, m.data[k]);
            w.emit();
          });
          es.onopen = () => setStatus('live');
          es.onerror = () => {
            setStatus('offline');
            if (es.readyState === 2) { clearTimeout(w.timer); w.timer = setTimeout(open, 3000); }
          };
        };
        open();
      } else {
        w.load = () => { w.cache = clone(getAt(localDb(), base)) || {}; };
        w.load(); setTimeout(() => w.emit(), 0);
      }
      watchers.add(w);
      return () => { w.closed = true; clearTimeout(w.timer); if (w.es) w.es.close(); watchers.delete(w); };
    },

    /* path: 'ch3/act/uid' 처럼 방 기준 경로. value===null 이면 삭제 */
    put(path, value) {
      watchers.forEach((w) => {
        const b = w.base;
        if (!b) { setAt(w.cache, path, value); return; }
        if (path === b || path.startsWith(b + '/')) {
          if (path === b) w.cache = value || {}; else setAt(w.cache, path.slice(b.length + 1), value);
        }
      });
      watchers.forEach((w) => w.emit());
      if (LIVE) {
        const url = `${BASE}/${encodeURIComponent(ROOT)}/${encodeURIComponent(room)}/${path}.json`;
        return fetch(url, value == null ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify(value) })
          .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); setStatus('live'); })
          .catch((e) => { setStatus('offline'); throw e; });
      }
      const db = localDb(); setAt(db, path, value); saveDb(db);
      return Promise.resolve();
    },
    getAt, setAt
  };

  function mergeDeep(a, b) {
    const out = clone(a) || {};
    (function rec(t, s) {
      for (const k in s) {
        if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) rec(t[k], s[k]);
        else t[k] = s[k];
      }
    })(out, b);
    return out;
  }

  function dbKey() { return 'nw.local.' + room; }
  function localDb() { return lsGet(dbKey(), {}) || {}; }
  function saveDb(db) { lsSet(dbKey(), db); }
  window.addEventListener('storage', (e) => {
    if (!LIVE && e.key === dbKey()) watchers.forEach((w) => { w.load(); w.emit(); });
  });

  ST.store = store;
})();
