/* HARD FIVE : fake adapter (?sync=fake)
   An in-memory crew mirrored through localStorage + BroadcastChannel('hardfive-fake'), so two tabs on file:// or localhost
   act as two phones. Same seam and the same semantics as the Firestore adapter: per-person writes, full snapshots out,
   day counts derived from anchors. Identity is per tab (sessionStorage), so each tab can claim a different run.
   Stencils LIVE, so screenshots read as the real thing; the deck-log panel names it FAKE. */
import { TASKS, linksOf } from '../days.js';
import { clock, storeGet, storeSet, storeDel, clone, Q } from '../state.js';

const KEY = 'hardfive.fake', UID_KEY = 'hardfive.fake.uid', CHANNEL = 'hardfive-fake';

export function defaultRoster(today) {
  return [1, 2, 3, 4, 5].map(i => ({ id: 'p' + i, name: i === 1 ? 'WADE' : '', anchor: { date: today, day: 1 }, uids: [] }));
}
function emptyLinks() { const l = {}; TASKS.forEach(t => { l[t] = null; }); return l; }
function maxTime(links) { return links.reduce((m, t) => (t != null && (m == null || t > m) ? t : m), null); }

export function createFake() {
  let cb = null, crew = null, chan = null, uid = null;
  function readStore() { try { const raw = storeGet(KEY); if (raw) { const all = JSON.parse(raw); return all[crew] || null; } } catch (e) {} return null; }
  function writeStore(data) {
    let all = {}; try { const raw = storeGet(KEY); if (raw) all = JSON.parse(raw) || {}; } catch (e) {}
    all[crew] = data; storeSet(KEY, JSON.stringify(all));
    try { if (chan) chan.postMessage({ crew }); } catch (e) {}
  }
  function ensure() {
    let data = readStore();
    if (!data) { data = { roster: defaultRoster(clock.key()), days: {}, createdAt: Date.now() }; writeStore(data); }
    return data;
  }
  function emit() { if (!cb) return; const data = ensure(); cb({ roster: clone(data.roster), days: clone(data.days) }); }
  function ident() {
    uid = storeGet(UID_KEY, true);
    if (!uid) { uid = 'fake-' + Math.random().toString(36).slice(2, 10); storeSet(UID_KEY, uid, true); }
    return uid;
  }
  return {
    name: 'LIVE', label: 'FAKE', live: true,
    get uid() { return uid; },
    start(crewId, fn) {
      crew = crewId; cb = fn; ident();
      if (Q.get('reset') === '1') storeDel(KEY);
      try { chan = new BroadcastChannel(CHANNEL); chan.onmessage = ev => { if (!ev.data || ev.data.crew === crew) emit(); }; } catch (e) { chan = null; }
      try { window.addEventListener('storage', ev => { if (ev.key === KEY) emit(); }); } catch (e) {}
      ensure(); emit();
      return Promise.resolve();
    },
    setLink(pid, task, t) {
      const data = ensure(), date = clock.key();
      if (!data.days[date]) data.days[date] = {};
      const r = data.days[date][pid] || (data.days[date][pid] = { links: emptyLinks(), doneAt: null, doneSeq: null, struck: [] });
      r.links[task] = t;
      const arr = linksOf(r), made = arr.every(x => x != null);
      if (t != null) { if (made) { r.doneAt = maxTime(arr); r.doneSeq = Date.now(); } }
      else { if (r.doneAt) r.struck = (r.struck || []).concat([r.doneAt]); r.doneAt = null; r.doneSeq = null; }
      writeStore(data); emit();
      return Promise.resolve();
    },
    setRoster(roster) {
      const data = ensure();
      data.roster = roster.map(p => { const sv = data.roster.find(q => q.id === p.id); return { id: p.id, name: p.name, anchor: clone(p.anchor), uids: sv ? sv.uids : (p.uids || []).slice() }; });
      writeStore(data); emit();
      return Promise.resolve();
    },
    claim(pid) {
      const data = ensure(), me = ident();
      data.roster.forEach(p => { p.uids = (p.uids || []).filter(u => u !== me); if (p.id === pid) p.uids.push(me); });
      writeStore(data); emit();
      return Promise.resolve();
    }
  };
}
