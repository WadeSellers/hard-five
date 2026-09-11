/* HARD FIVE : Firestore adapter (stencil LIVE)
   Firebase modular web SDK as ES modules from gstatic; Anonymous Auth; one crew document and one document per day.

   Data model:
     crews/{crewId}                       { roster: [ { id, name, anchor: { date: 'YYYY-MM-DD', day: N }, uids: [...] } ], createdAt }
     crews/{crewId}/days/{YYYY-MM-DD}     { [pid]: { links: { DIET: 'HHMM'|null, LIFT, OUT, GAL, READ, PHOTO }, doneAt: 'HHMM'|null, doneSeq: N|null, struck: ['HHMM', ...] } }

   Each client writes ONLY its own person's map, with updateDoc and dotted field paths ('p1.links.DIET'); the day document is
   created with setDoc({ merge: true }) on the first write of the day. Realtime: onSnapshot on the crew doc and on today's and
   yesterday's day docs (yesterday is what the fall / parted display reads). Older days back to the earliest anchor are
   fetched once, so day counts can be walked from the anchors; nothing per day is ever stored as a count. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, onSnapshot, setDoc, updateDoc, runTransaction, getDocs, query, where, documentId, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { TASKS, addDays, linksOf } from '../days.js';
import { clock, clone } from '../state.js';
import { defaultRoster } from './fake.js';

function emptyLinks() { const l = {}; TASKS.forEach(t => { l[t] = null; }); return l; }
function maxTime(links) { return links.reduce((m, t) => (t != null && (m == null || t > m) ? t : m), null); }
function nested(patch) {   // { 'p1.links.DIET': v } -> { p1: { links: { DIET: v } } }
  const out = {};
  Object.keys(patch).forEach(k => { const parts = k.split('.'); let o = out; parts.slice(0, -1).forEach(p => { o = o[p] || (o[p] = {}); }); o[parts[parts.length - 1]] = patch[k]; });
  return out;
}

export function createFirestore(config) {
  let cb = null, crewId = null, app = null, db = null, auth = null, uid = null;
  let roster = null, days = {}, exists = {}, unsubs = {}, historyFrom = null, loaded = { crew: false, history: false }, ready = false;

  function crewRef() { return doc(db, 'crews', crewId); }
  function dayRef(key) { return doc(db, 'crews', crewId, 'days', key); }
  function emit() {
    if (!cb || !loaded.crew || !loaded.history) return;
    const k = clock.key(), y = addDays(k, -1);
    if (!(k in exists) || !(y in exists)) return;     // both live day docs have reported at least once
    ready = true; cb({ roster: clone(roster), days: clone(days) });
  }
  function listenDay(key) {
    if (unsubs[key]) return;
    unsubs[key] = onSnapshot(dayRef(key), snap => {
      if (snap.exists()) days[key] = snap.data(); else delete days[key];
      exists[key] = snap.exists(); emit();
    }, err => { console.warn('day listener', key, err); exists[key] = exists[key] || false; emit(); });
  }
  function rotate() {
    const k = clock.key(), y = addDays(k, -1);
    Object.keys(unsubs).forEach(key => { if (key !== k && key !== y) { unsubs[key](); delete unsubs[key]; } });
    listenDay(y); listenDay(k);
  }
  async function loadHistory() {
    // every day from the earliest anchor up to (not including) yesterday; those docs are only ever read again if an anchor moves earlier
    const k = clock.key(), y = addDays(k, -1);
    const from = (roster || []).reduce((m, p) => (p.anchor && p.anchor.date && p.anchor.date < m ? p.anchor.date : m), y);
    if (historyFrom !== null && from >= historyFrom) { loaded.history = true; return; }
    try {
      if (from < y) {
        const qs = await getDocs(query(collection(db, 'crews', crewId, 'days'), where(documentId(), '>=', from), where(documentId(), '<', y)));
        qs.forEach(d => { days[d.id] = d.data(); exists[d.id] = true; });
      }
      historyFrom = from;
    } catch (e) { console.warn('history', e); }
    loaded.history = true;
  }
  async function ensureCrew() {
    try {
      await runTransaction(db, async tx => {
        const snap = await tx.get(crewRef());
        if (!snap.exists()) tx.set(crewRef(), { roster: defaultRoster(clock.key()), createdAt: serverTimestamp() });
      });
    } catch (e) { console.warn('ensure crew', e); }
  }
  function signIn() {
    return new Promise(resolve => {
      let done = false;
      onAuthStateChanged(auth, user => { if (user && !done) { done = true; uid = user.uid; resolve(uid); } });
      signInAnonymously(auth).catch(e => { console.warn('anonymous sign-in', e); if (!done) { done = true; resolve(null); } });
    });
  }

  return {
    name: 'LIVE', label: 'FIRESTORE', live: true,
    get uid() { return uid; },
    async start(crew, fn) {
      crewId = crew; cb = fn;
      app = initializeApp(config);
      try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
      catch (e) { db = getFirestore(app); }
      auth = getAuth(app);
      await signIn();
      await ensureCrew();
      onSnapshot(crewRef(), async snap => {
        roster = snap.exists() && Array.isArray(snap.data().roster) ? snap.data().roster : [];
        loaded.crew = true;
        await loadHistory();
        rotate(); emit();
      }, err => { console.warn('crew listener', err); });
      clock.onChange((key, changed) => { if (changed) { rotate(); loadHistory().then(emit); } });
    },
    async setLink(pid, task, t) {
      const key = clock.key(), cur = (days[key] || {})[pid] || {};
      const links = Object.assign(emptyLinks(), cur.links || {}); links[task] = t;
      const arr = linksOf({ links }), made = arr.every(x => x != null), patch = {};
      patch[pid + '.links.' + task] = t;
      if (t != null) { if (made) { patch[pid + '.doneAt'] = maxTime(arr); patch[pid + '.doneSeq'] = Date.now(); } }
      else if (cur.doneAt) { patch[pid + '.struck'] = (cur.struck || []).concat([cur.doneAt]); patch[pid + '.doneAt'] = null; patch[pid + '.doneSeq'] = null; }
      if (exists[key]) {
        try { await updateDoc(dayRef(key), patch); return; }
        catch (e) { if (!e || e.code !== 'not-found') throw e; }
      }
      const first = nested(patch); if (!first[pid].links || Object.keys(first[pid].links).length < 6) first[pid].links = Object.assign(emptyLinks(), first[pid].links);
      if (first[pid].struck === undefined) first[pid].struck = cur.struck || [];
      if (first[pid].doneAt === undefined) first[pid].doneAt = cur.doneAt || null;
      if (first[pid].doneSeq === undefined) first[pid].doneSeq = cur.doneSeq || null;
      await setDoc(dayRef(key), first, { merge: true });
    },
    async setRoster(next) {
      const shape = r => r.map(p => ({ id: p.id, name: p.name || '', anchor: { date: p.anchor.date, day: +p.anchor.day || 1 }, uids: (p.uids || []).slice() }));
      try {
        await runTransaction(db, async tx => {
          const snap = await tx.get(crewRef()), server = snap.exists() ? (snap.data().roster || []) : [];
          const merged = shape(next).map(p => { const sv = server.find(q => q.id === p.id); return sv ? Object.assign(p, { uids: sv.uids || [] }) : p; });
          if (snap.exists()) tx.update(crewRef(), { roster: merged }); else tx.set(crewRef(), { roster: merged, createdAt: serverTimestamp() });
        });
      } catch (e) {   // offline: queue the plain write, it lands when the connection returns
        console.warn('setRoster transaction', e);
        await setDoc(crewRef(), { roster: shape(next) }, { merge: true });
      }
    },
    async claim(pid) {
      if (!uid) return;
      const move = r => r.map(p => Object.assign({}, p, { uids: (p.uids || []).filter(u => u !== uid).concat(p.id === pid ? [uid] : []) }));
      try {
        await runTransaction(db, async tx => {
          const snap = await tx.get(crewRef()); if (!snap.exists()) return;
          tx.update(crewRef(), { roster: move(snap.data().roster || []) });
        });
      } catch (e) {
        console.warn('claim transaction', e);
        if (roster) await setDoc(crewRef(), { roster: move(roster) }, { merge: true });
      }
    }
  };
}
