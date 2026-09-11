/* HARD FIVE : LocalSample adapter (stencil LOCAL)
   The prototype's sample crew, replayed against the real clock, with this device's taps and roster edits kept in localStorage.
   Same seam as the live adapters:
     sync = { name, label, live, start(crewId, cb), setLink(pid, task, timeOrNull), setRoster(roster), claim(pid) }
     cb receives full snapshots { roster, days }; the deck renders from snapshots only.
   Sample (times local): WADE day 23, TOM 52 (made by 1740), MIKE 24, JESS 39, DAN parted yesterday at 34, day 1. */
import { TASKS, addDays, linksOf } from '../days.js';
import { clock, dateKey, hhmm, storeGet, storeSet, storeDel, clone, Q } from '../state.js';

const SCHEDULE = {
  tom:  { DIET: '0630', LIFT: '0655', OUT: '0745', GAL: '1420', READ: '1630', PHOTO: '1740' },
  mike: { DIET: '0700', LIFT: '0745', GAL: '1130', OUT: '1800', READ: '2110', PHOTO: '2145' },
  jess: { OUT: '0610', DIET: '0900', GAL: '1300', LIFT: '1830', READ: '2200', PHOTO: '2240' },
  dan:  { DIET: '1215', GAL: '1500', LIFT: '1900' }
};
const KEY = 'hardfive.local';

function sampleRoster(today) {
  const y = addDays(today, -1);
  return [
    { id: 'wade', name: 'WADE', anchor: { date: today, day: 23 }, uids: [] },
    { id: 'tom',  name: 'TOM',  anchor: { date: today, day: 52 }, uids: [] },
    { id: 'mike', name: 'MIKE', anchor: { date: today, day: 24 }, uids: [] },
    { id: 'jess', name: 'JESS', anchor: { date: today, day: 39 }, uids: [] },
    { id: 'dan',  name: 'DAN',  anchor: { date: y, day: 34 }, uids: [] }
  ];
}
function emptyLinks() { const l = {}; TASKS.forEach(t => { l[t] = null; }); return l; }
function maxTime(links) { return links.reduce((m, t) => (t != null && (m == null || t > m) ? t : m), null); }

export function createLocal() {
  let cb = null, store = null, last = null;
  function load() {
    if (Q.get('reset') === '1') storeDel(KEY);
    try { const raw = storeGet(KEY); if (raw) store = JSON.parse(raw); } catch (e) {}
    if (!store || !store.roster || !store.days) store = { roster: sampleRoster(clock.key()), days: {} };
  }
  function save() { storeSet(KEY, JSON.stringify(store)); }
  // the schedule's record for a person on a date: full for past days, up to now for today, nothing for the future
  function scheduled(pid, date, nowKey, nowT) {
    const sch = SCHEDULE[pid]; if (!sch) return null;
    const links = emptyLinks(); let seq = 0;
    TASKS.forEach((t, i) => { const at = sch[t]; if (at && (date < nowKey || (date === nowKey && at <= nowT))) { links[t] = at; seq = i + 1; } });
    const arr = linksOf({ links }), made = arr.every(x => x != null);
    return { links, doneAt: made ? maxTime(arr) : null, doneSeq: made ? seq : null, struck: [] };
  }
  function snapshot() {
    const now = clock.now(), nowKey = dateKey(now), nowT = hhmm(now), days = {};
    // every date from the earliest anchor to today, so day counts can be walked; persisted records override the schedule
    let d = store.roster.reduce((m, p) => (p.anchor && p.anchor.date < m ? p.anchor.date : m), nowKey), guard = 0;
    while (d <= nowKey && guard++ < 4000) {
      const doc = {};
      store.roster.forEach(p => { const s = scheduled(p.id, d, nowKey, nowT); if (s) doc[p.id] = s; });
      const saved = store.days[d]; if (saved) Object.keys(saved).forEach(pid => { doc[pid] = clone(saved[pid]); });
      if (Object.keys(doc).length) days[d] = doc;
      d = addDays(d, 1);
    }
    return { roster: clone(store.roster), days };
  }
  function emit(force) {
    if (!cb) return;
    const snap = snapshot(), j = JSON.stringify(snap);
    if (!force && j === last) return;
    last = j; cb(snap);
  }
  return {
    name: 'LOCAL', label: 'LOCAL SAMPLE', live: false,
    start(crewId, fn) {
      cb = fn; load(); emit(true);
      clock.onChange(() => emit(false));
      return Promise.resolve();
    },
    setLink(pid, task, t) {
      const date = clock.key();
      if (!store.days[date]) store.days[date] = {};
      let r = store.days[date][pid];
      if (!r) { const s = scheduled(pid, date, date, hhmm(clock.now())); r = store.days[date][pid] = s || { links: emptyLinks(), doneAt: null, doneSeq: null, struck: [] }; }
      r.links[task] = t;
      const arr = linksOf(r), made = arr.every(x => x != null);
      if (t != null) { if (made) { r.doneAt = maxTime(arr); r.doneSeq = Date.now(); } }
      else { if (r.doneAt) r.struck.push(r.doneAt); r.doneAt = null; r.doneSeq = null; }
      save(); emit(true);
      return Promise.resolve();
    },
    setRoster(roster) {
      store.roster = roster.map(p => ({ id: p.id, name: p.name, anchor: clone(p.anchor), uids: (p.uids || []).slice() }));
      save(); emit(true);
      return Promise.resolve();
    },
    claim(pid) { return Promise.resolve(); }
  };
}
